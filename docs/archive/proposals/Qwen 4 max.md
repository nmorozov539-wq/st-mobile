> I didn't give it a permission to consider deeply rewriting/remaking existing code! Others got this permission

Here's the draft. I've written it to slot into `docs/` alongside your existing conventions — discussion/proposal status, no implementation authority, evidence-based claims separated from hypotheses. Two new ST source reads informed the popup section (the `Popup` class mechanics and toastr usage); everything else builds on what we verified earlier.

---

# EXTENSION_UI_TRANSLATOR.md — draft v0.1

**Status: design proposal, 21 November 2026. Discussion document; no implementation selected or authorized.**
Companion to `EXTENSION_INTEGRATION.md` (hosting investigation) and `THEME_API.md` (token contract). This document covers *appearance translation of hosted extension surfaces only*. Hosting mechanics, surface discovery, lifecycle orchestration and per-message integration remain in the extension-integration track; nothing here authorizes them.

## 1. Purpose and position

Pocket's goal is maximal third-party SillyTavern extension support with a uniform product appearance. The settled direction from the integration discussion:

- Every extension is treated as third-party. No extension-specific adaptation ships before the generic path works. WI Hero and Summaryception are test specimens, not privileged cases.
- Extension UI is **hosted in place** in the engine document (the proven Milestone 3 mechanism), never transplanted into Pocket's document.
- The **translator** is a separate engine-side system that makes hosted surfaces render in Pocket's visual language. It changes appearance only. It is not part of the bridge, not part of the host, and not per-extension.
- Group chats and anything touching them are out of scope.
- "Native look" is pursued as far as the pattern vocabulary allows, including popup chrome. Structure and interaction depth are explicitly not translated (§8).

The product claim this enables: *every extension renders in Pocket's visual language; interaction integration deepens over time.* Appearance is uniform from the first hosted surface; the compatibility ladder concerns interaction depth, never looks.

## 2. Architecture: three systems, one boundary

```
┌─ Pocket document ──────────────────────────────┐
│  framing, navigation, theme store              │
│  owns: when a surface is hosted, which theme   │
└──────────────┬─────────────────────────────────┘
               │ MessagePort (existing bridge contract,
               │ extended with translator commands/events)
┌─ Engine document ──────────────────────────────┐
│  Surface host (generalized native-settings-    │
│  host): roots, guards, layers, Back, settle    │
│                                                │
│  Translator (this document):                   │
│   - token projection                           │
│   - pattern stylesheet                         │
│   - structural pass + observer                 │
│   - layer chrome reskin                        │
│   - drift registry + per-surface kill switch   │
│                                                │
│  ST + extensions: untouched behavior           │
└────────────────────────────────────────────────┘
```

**Ownership rules:**

- The host owns *behavior boundaries*: which roots are interactive, which layers exist, what Back dismisses, when closing is allowed. The translator owns *paint*. Neither reads the other's internals.
- They share exactly one artifact: the **layer registry** (§7). The host's dismiss probes and the translator's chrome reskin must key on the same selector set, defined once. Today's static four-popup allowlist becomes this registry; generalizing it is hosting-track work that the translator depends on.
- The translator is a single engine-side module (`prototype/extension/translator/` proposed), own version string, own tests, own drift fingerprints. A reskin bug must never be confusable with a hosting bug: with the translator disabled, a hosted session must behave *and render* exactly as plain ST.
- Failure containment: any translator exception disables the translator for that surface for the remainder of the session, logs one structured error record (existing taxonomy, category `unknown` or a new `translator` category — decide during planning), and leaves the surface fully usable in plain ST styling. The translator can never make a surface unrecoverable; the host's guard/close path does not depend on it.

## 3. Activation model

- The translator is **scoped to hosted sessions**. A root class (proposed `pocket-translated`) is set on the surface root(s) and on translated body-level layers. All translator CSS is gated under that class. The hidden engine at 1280×800 otherwise runs its own appearance untouched — extensions' own logic that reads computed styles outside sessions sees plain ST.
- Token values arrive from Pocket's active theme via the bridge at session open and on theme change. The translator writes them as CSS custom properties on the session scope. It never imports Pocket's theme engine; it consumes a flat, validated token projection (the same allowlisted-role discipline as `THEME_API.md`).
- Fonts: Pocket's vendored Rubik/Literata woff2 are served same-origin; the translator declares `@font-face` inside the engine document scoped to translated surfaces. No network loads.
- Per-surface kill switch: a durable flag (engine-side settings namespace, proposed `extension_settings.pocket_tavern.translator.disabledSurfaces`) drops individual surfaces to plain ST. Plus one global off. Recovery is reachable without the translator functioning.

## 4. The pattern inventory (translation contract v1)

ST extension UI is a closed vocabulary taught by the official extension guide. The translator keys on **classes and structure, never extension identity**. Inventory below is the starting contract; each rule needs verification against real templates during the spike (§9). Confidence marks: ● verified in sources read, ◐ strongly evidenced convention, ○ hypothesis to verify.

### 4.1 Containers and hierarchy

| ST pattern | Conf. | Pocket target |
|---|---|---|
| `.inline-drawer` / `.inline-drawer-toggle` / `.inline-drawer-header` / `.inline-drawer-content` / `.inline-drawer-icon.down/up` | ● | Card + chevron disclosure; header typography, hairline separators; icon → Lucide chevron |
| `.standoutHeader`, `.title_restorable` | ● | Section header role |
| `h3`, `h4` inside settings blocks | ● | Section/subsection type scale |
| `.range-block`, `.range-block-title`, `.range-block-range-and-counter` | ● | Settings row rhythm: label line, control line, counter chip |
| `.flex-container`, `.flexNoGap`, `.flexFlowColumn`, `.wide100p`, `.flex1` | ● | Preserve layout semantics; normalize gaps/margins to spacing steps only |
| `.notes-link`, `.note-link-span`, `fa-circle-question` help links | ● | Caption/help treatment; keep external-link behavior (host policy) |
| `.info-block`, `.neutral_warning`, `.redWarningBG`, warning/error banners | ● | Pocket banner roles (warning/danger surfaces) |
| `hr` | ● | Hairline border role |

### 4.2 Controls

| ST pattern | Conf. | Pocket target |
|---|---|---|
| `.menu_button`, `.menu_button_icon` | ● | Button geometry, radius, border, hover/pressed from theme; min hit target enforced by padding |
| `.text_pole` (input/textarea/select) | ● | Text field role: background, border, radius, focus ring; `textarea_compact`, `autoSetHeight` respected |
| `input[type=range]` (`.neo-range-slider`) + `.neo-range-input` counter | ● | Slider track/thumb colors; counter as bounded numeric chip |
| `.checkbox_label` + bare checkbox | ● | Row treatment; visual toggle restyle via appearance:none where safe (§5 limits) |
| select2: `.select2-container`, `.select2-selection`, `.select2-dropdown`, `.select2-results__option--highlighted` | ● | Field + dropdown sheet treatment; **portal-aware** (§7) |
| `.editor_maximize` (textarea expand) | ● | Icon map; resulting popup gets chrome reskin |
| `input[type=file]` (usually hidden) + trigger buttons | ● | Trigger button only; never touch the hidden input |
| FontAwesome `<i class="fa-*">` | ● | Structural pass → Lucide via semantic map (§6); unmapped icons keep FA glyphs, recolored |

### 4.3 Layers (shared registry with the host)

| ST pattern | Conf. | Pocket target |
|---|---|---|
| `.popup` + `.popup-content`, `.popup-controls`, `.popup-button-ok/cancel`, `.popup-crop-wrap` etc. | ◐ | Sheet/dialog geometry: radius, scrim, control bar as Pocket dialog actions; large/wide variants → full-height sheet at phone width |
| `#dialogue_popup` (legacy) | ● | Same treatment |
| `#completion_prompt_manager_popup` | ● | Full-screen tool framing (already hosted today) |
| toastr: `#toast-container`, `.toast`, `.toast-success/error/warning/info`, `.toast-close-button` | ● | Pocket toast roles; position within safe areas; **behavior stays toastr's** (native-notices forwarding already exists separately) |
| `.ui-dialog` / jQuery UI dialogs, autocomplete menus | ○ | Registry candidates; verify which built-ins/extensions actually spawn them |
| Extension-custom body-level panels | ○ | Not in v1. Unclassified layers get **no paint**, only host guard handling. Honest degradation |

### 4.4 Explicit non-goals of the inventory

- No rules keyed on any extension's own IDs/classes (`#sc_*`, `.wihero-*`, `#qr--*`…). If a bespoke widget matches generic patterns (a `.menu_button` inside a canvas toolbar), it gets that rule; nothing more.
- No layout restructuring: DOM order, flex direction, grid placement, positioning schemes stay the author's.
- No hiding of anything. Visibility is capability, owned by the extension and the host contract.

## 5. Structural pass

CSS cannot do everything. A minimal, idempotent DOM pass handles the rest, under strict rules:

**Allowed:**
1. Icon substitution: replace `<i class="fa-solid fa-x">` with the Lucide equivalent from a fixed semantic map (trash-can→delete, floppy-disk→save, pen→edit, plus→plus, xmark→close, chevrons, circle-question→help, …). Original classes preserved on a wrapper or data attribute so extension code selecting the icon still finds a node; `click` targets must remain valid (replace content, keep the `<i>` element itself where handlers may be bound to it — prefer inner SVG injection over node replacement).
2. Additive wrappers for row grouping where a bare `label`+`input` pair needs Pocket row padding — **only** when the wrapper is display-neutral (contents-equivalent) and never around elements whose sibling/parent selectors are known-conventional (`.checkbox_label` inputs, select2 internals).
3. Setting `translate`/`data-i18n`-irrelevant cosmetic attributes; never `id`, `name`, `value`, `type`, `checked`, `disabled`, `style` (except the session scope properties), never event-relevant classes removed.

**Forbidden:** removing nodes, reordering children of any container with bound delegation, touching form state, injecting anything interactive, rewriting text content.

**Observer discipline:** one MutationObserver per hosted session, scoped to surface roots + registered layers, batched via rAF, coalesced (WI Hero redraws at ≤150ms cadence; Summaryception `updateUI()` rewrites blocks). Every transform must be idempotent and marked (data attribute) so re-runs are O(changes), not O(tree). Observer disconnects on session close; all transforms are either naturally destroyed with the extension's own redraw or reverted on close for persistent nodes (icons in long-lived settings blocks). Budget: the pass must not measurably extend a 150ms redraw cycle — measure in the spike.

## 6. Typography, color, geometry mapping

- Token projection = the semantic roles from `THEME_API.md` (canvas/surfaces/elevation, text tiers, borders/focus, action/on-action, success/warning/danger, scrim/shadow, radii/spacing/type steps). The translator maps ST selectors → roles; it never hard-codes colors. Theme switch mid-session reprojects live.
- Character-accent policy does **not** apply inside translated surfaces (extensions have no accent contract); action color is the theme's, uniformly.
- Hit targets: enforce minimums by padding/min-height on interactive elements only, never by shrinking anything. Where an extension's layout cannot absorb the minimum without overlap, the rule yields (log a drift note) rather than breaking layout — accessibility floor applies to Pocket-framed chrome always, to translated content best-effort. This limit is stated honestly in §8.
- Reduced motion: translator-added transitions respect the preference; extension-owned animation is not touched.

## 7. Layer chrome ("as far as we can take it")

Popups are the highest-value target: every install/update/delete/confirm flow routes through ST's `Popup`. Approach:

- The **layer registry** (single shared module) classifies body-level layers: `popup`, `legacy-dialogue`, `prompt-manager`, `select2`, `toastr`, `unknown`. Host uses it for guards/dismiss probes; translator uses it for paint scoping. One source of truth; adding a class is one edit reviewed by both tracks.
- Popup chrome reskin is CSS-only in v1: dialog geometry, header/control-bar typography, button roles, scrim. At phone width, `wide`/`large` popups become full-height sheets visually (position/size overrides scoped to the layer, which is body-level and outside extension layout flow — safe to reposition). Internal popup content is translated by the normal pattern rules.
- **Known coupling risk:** ST's `Popup` measures itself for scroll/height behavior and its close controls are what dismiss probes click. Repositioning must not invalidate probe selectors or measured assumptions. Spike gate: run the existing dismiss-probe suite against reskinned popups, including stacked popups (install warning → progress → result) and the crop popup (image import).
- toastr: paint only; dismissal/timing stays native. Stacking position moves into Pocket-safe insets. The separate notice-forwarding system is unaffected (it wraps, not restyles).
- Unknown layers: no paint, ever, in v1. A user seeing one unstyled panel inside an otherwise translated surface is acceptable honest degradation; a broken mystery panel is not.

## 8. What the translator does not do (stated for the product claim)

1. **Structure is the author's.** A settings block becomes a Pocket-styled page, not a Pocket navigation flow. No regrouping across extensions, no converting drawers to sheets-of-sections.
2. **Bespoke widgets degrade gracefully.** Canvases (WI Hero Hero mode), graphs, custom-styled components receive typography/color/button rules where generic patterns match; their internal geometry remains theirs. WI Hero Normal mode is expected to translate well; Hero mode partially.
3. **Per-message UI in Pocket's chat DOM is out of scope here.** That is the proxy/observe frontier in the integration track. The translator only paints hosted engine surfaces.
4. **Behavior is never translated.** Handlers, persistence, validation, keyboard shortcuts inside the surface stay ST's/extension's.
5. **Best-effort accessibility inside content** (§6); Pocket framing always meets the floor.

## 9. Validation plan (proposal — gates for a future authorization)

**Specimens, in order:** (1) the extensions drawer containing ST's manager UI + Summaryception's settings block — densest generic vocabulary; (2) WI Hero Normal mode at phone width — hardest realistic case, independently updated; (3) one never-adapted third-party extension installed fresh via the native flow (candidate: a small popular one, chosen at planning time) — proves the no-per-extension-code claim; (4) the install/update/delete popup chain end-to-end.

**Gates:**
- A. **Behavior neutrality:** with translator ON vs OFF, the existing hosting test suite (guards, Back chain, settle/close, focus restore, dismiss probes) passes identically. Any difference is a translator bug, full stop.
- B. **State integrity:** operate every control class in specimen 1 (sliders incl. counter edits, select2 single/multi, checkboxes, textareas with autoSetHeight, file import, custom-prompt slots) and verify saved `extension_settings` matches the same operations performed unstyled.
- C. **Churn stability:** 10 minutes of WI Hero refresh cycles + Summaryception `updateUI()` storms; observer cost measured; no leaked nodes/listeners after close; memory stable.
- D. **Visual contract:** side-by-side screenshots vs a real Pocket settings page under all four themes, phone + tablet widths, large text, reduced motion. Reviewed like Milestone 3 visual gates.
- E. **Recovery:** injected translator exception → surface stays usable plain-ST; per-surface and global kill switches reachable; theme corruption falls back with the surface intact.
- F. **Drift:** fingerprint list of every keyed selector + the ST internals the structural pass relies on, checked against pinned ST (WI Hero's `st-drift.mjs` workflow is the model). CI job proposed alongside existing checks.

Real-phone/WebView qualification inherits the outstanding Milestone 3 debt; nothing here claims it.

## 10. Open questions

1. Token projection transport: extend the handshake/session-open payload vs a dedicated `translator.configure` method. (Leaning: session-open payload + `translator.themeChanged` event; keeps one round-trip.)
2. New structured-error category `translator` vs reuse `unknown`.
3. Where the kill-switch UI lives (Extensions hub per-surface row vs Appearance). Hub seems right; Appearance owns themes, not hosting.
4. Icon map governance: who approves additions, and what happens to FA glyphs with no semantic equivalent (keep, recolor — proposed).
5. Does the translator stylesheet ship as one file or per-category files (containers/controls/layers)? One file is simpler to version; split aids drift attribution.
6. Exact ST revision re-verification: inventory confidence marks were sourced from 1.19.0 tag reads; recheck against the pinned engine commit before any implementation, per repo convention.

## 11. Relationship to existing documents

- `EXTENSION_INTEGRATION.md`: remains the parent investigation. This document answers its question 2 ("can native hosting preserve behavior") for the *appearance* dimension only, and adds the translator as a candidate component. Hosting generalization, lifecycle, sync and contextual actions stay there.
- `LAYOUT.md`: the Extensions hub placeholder decision stands; nothing here designs the hub.
- `THEME_API.md`: the translator is a new consumer of the same contract; it must not extend theme powers (no theme may target extension internals directly).
- Roadmap: this would sit inside the extension-integration track, after the surface-host generalization spike it depends on. No milestone placement is proposed yet.

---

Two things I'd flag about the draft itself: the **layer registry** (§7) is the one piece that genuinely couples the two systems, and it's worth keeping that coupling as narrow as it is here — it's the seam where a future bug would be hardest to attribute. And gate A (behavior neutrality ON/OFF) is the load-bearing gate: it's what lets you keep claiming the hosting mechanism is proven while the translator iterates fast and loose on top.
