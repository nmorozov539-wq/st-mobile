# Pocket Tavern: product, Android and release roadmap

Status: active, realigned 18 November 2026 around the Layout v4 product pass.

Android work has started, but it should not slow ordinary product development. Pocket Tavern will keep its fast browser/Termux workflow while a bounded Kotlin packaging track proves that the same web product can eventually ship as a self-contained Android application.

## Product and development decisions

The eventual product is an **Android application with a web-native interface**:

- Kotlin remains the thin native Android host.
- Android owns installation, the in-process Node/SillyTavern runtime, lifecycle, files, system integration, security and recovery.
- Pocket remains one HTML, CSS and JavaScript frontend served locally by the bundled SillyTavern process and displayed in a WebView.
- There is no Jetpack Compose, Flutter, React Native or native-view rewrite of the Pocket interface.
- The browser/Termux build remains the primary feature-development and testing loop until the product approaches an installable beta.
- APK snapshots are made at meaningful milestones, not after every frontend change.

This separates two different concerns: fast feature development and eventual consumer packaging.

## Starting point and current branches

The separate web and Android histories were converged on 18 November 2026. The repository now has two active branches:

- `main` is the stable integration and APK-packaging line. It contains the converged web/Android history and the validated thin Kotlin host.
- `dev` is the active browser/Termux product line. Layout, bridge, theme and feature work happens here before a stable checkpoint is promoted to `main`.

Historical checkpoints remain inspectable in Git, including the complete 0.8.0 product at `d9e437b`, Android Step 1 at `73113df`, Android Step 2 at `f45a36b` and the convergence merge at `cad0d50`. Old checkpoint branches were removed only after their history was contained in the active lines; the `pre-0.8` and `android-debug-latest` tags remain.

The Android foundation is adapted from `RodneyCw1/SillyTavern-Android`, with its prebuilt Node 22.23.2 runtime pinned by SHA-256. SillyTavern 1.19.0 is also pinned by exact commit. Preserve the AGPL and third-party notices throughout convergence.

## Three product layers

### 1. Kotlin Android host

The existing Kotlin/Gradle approach is the selected packaging architecture. Kotlin is an integration layer, not a second implementation of the product UI.

It owns:

- `MainActivity`, the WebView and Android-facing navigation;
- the `EngineService` foreground service and separate `:runtime` process;
- engine installation and verified updates;
- app-private user data, backup, restore and migration;
- system Back, IME/insets, file picking, downloads and clipboard;
- notifications, wake locks, crash recovery and security around the local server;
- signed builds, release channels and platform compliance.

It must not contain screen-specific Pocket layout or theme decisions. No native UI-framework migration is planned unless the WebView architecture later fails a concrete requirement that cannot reasonably be solved at the host boundary.

### 2. Web product

It owns:

- screen hierarchy, navigation and interaction semantics;
- the Pocket bridge and all guarded ST operations;
- responsive layout and minimum accessible target sizes;
- user-visible state, drafts, recovery and errors;
- theme resolution and rendering.

The browser/Termux package remains the canonical fast development surface and a compatibility/fallback release until the APK passes its migration and recovery gates. The 0.8 layout is an implemented reference, not the product structure to preserve. Layout v4 is a major product pass covering navigation, hierarchy, configuration ownership, extension access, phone/tablet composition and visual behavior.

### 3. Theme and brand

Themes own color, typography, component geometry, surface material, icon treatment, message treatment, character accents, background effects and restrained motion. They may substantially change the atmosphere without moving navigation or hiding essential controls.

Branding later chooses the product name, launcher identity, voice, signature motif and default theme. It must not be hard-coded into every component token before that decision exists.

## Delivery strategy

Use two coordinated tracks.

### Product track — primary

- develop functions, safeguards, UX and themes in the browser/Termux environment;
- keep fast deterministic tests and local mock-provider coverage authoritative for web behavior;
- release browser/Termux milestones while that remains useful;
- avoid Android build/install overhead for work that does not exercise Android.

### Packaging track — bounded

- converge the Android sources into the same repository history;
- make bundled SillyTavern boot reliably in CI and on one physical phone;
- pause native work once the host risk is understood and the path remains viable;
- package stable product milestones periodically;
- finish lifecycle, migration, security and distribution work closer to beta.

Browser tests establish product correctness. APK tests establish lifecycle, platform integration and release readiness. Neither substitutes for the other.

## Milestone 0: converge safely

**Status: complete on 18 November 2026.**

Create a dedicated integration branch from `0.8-phase4-6`, then merge the Android Step 2 history into it. This puts the Kotlin project and web product in one history without making Android the daily development loop.

Before resolving or deleting any historical branches:

- tag the current 0.8.0 web release and the Android Step 1 spike;
- record exact source commits and build inputs;
- retain the existing browser package and test evidence as a fallback;
- verify the merge changes no 0.8 behavior before Android-specific integration begins.

Acceptance:

- one branch contains the complete 0.8 product plus the Kotlin Android project;
- existing automated web tests pass unchanged;
- Android Step 1 and Step 2 history and attribution remain inspectable;
- CI can address web tests and Android builds independently from the same revision.

Recorded result:

- strategy documentation was committed at `a504508` and the explicit integration merge at `cad0d50`;
- `origin/integration/0.8-android-step2` tracks the same merge revision;
- the merge had no textual conflicts and did not change or delete established 0.8 web/product files;
- Android source, workflow, AGPL license and third-party notices are present alongside the web product;
- Android CI run 8 built arm64-v8a and x86_64 debug APKs and passed the x86_64 emulator smoke test;
- `git diff --check`, Android build-script syntax checks and Gradle-wrapper integrity checks passed;
- 261 of 262 web tests pass under the literal local `npm test`. The remaining phone-repair subprocess assertion reproduces unchanged from clean `d9e437b` and is tracked as pre-existing test-harness debt, not an integration regression;
- the Android Step 1 tag is preserved. A dedicated 0.8 web-release tag remains optional housekeeping because the source branch and exact revision `d9e437b` are retained remotely;

## Milestone 1: bounded Android-host validation

**Status: complete on 18 November 2026 at validation commit `b1b793e`.**

Finish enough of Android Step 2 to prove the selected Kotlin host remains viable, then return primary effort to the web product.

Required work:

- make the x86_64 emulator smoke test run in CI;
- produce arm64-v8a and x86_64 debug APKs from pinned inputs;
- verify the APK installs and boots unmodified ST 1.19.0 without Termux;
- verify first-start compilation and later warm starts;
- verify stopping and restarting the `:runtime` process;
- verify backgrounding and lock/unlock do not immediately invalidate the approach;
- verify user data is separate from replaceable engine code;
- keep engine/runtime logs bounded and free of secrets.

Acceptance:

- CI builds both debug APKs and boots the emulator APK successfully;
- one real arm64 phone completes a short start/background/stop/reopen checklist;
- the result identifies remaining native risks without requiring the Pocket frontend to move yet;
- no network download is required on first app start; all runtime payloads are already in the APK.

After this gate, native work may pause while the product track continues.

Recorded result:

- CI run 44303995381 built both ABI APKs and passed the API 34 x86_64 emulator smoke test at `b1b793e`;
- the checksum-pinned arm64 APK completed fresh and warm starts, background/foreground, secure lock/unlock, runtime-loss observation and full stop/reopen on a Xiaomi 2201116SC;
- the demonstrated unbounded runtime log was fixed with two private 1 MiB rotating files and validated by a native stress harness, CI and physical boot;
- a saved default profile survived full app restarts, confirming the current code/data separation within this milestone's scope;
- runtime crash auto-recovery, stable APK signing, the private gateway and later distribution/recovery work remain explicit native risks;
- exact device, timing, checksum, security and limitation evidence is in [the Milestone 1 phone report](ANDROID_MILESTONE1_PHONE_VALIDATION.md).

## Milestone 2: layout-resilient theme contract

**Status: contract foundation complete on `dev` on 18 November 2026. Product-facing theme management moves into Milestone 3 so it is designed with Layout v4 rather than bolted onto the outgoing Settings structure.**

The versioned engine, semantic colors, bounded geometry/material/message/motion roles, local typography, semantic Lucide treatment, character-accent policy, v1 migration and two proof themes are implemented. The engine/store provide staged preview, import/export and reset primitives. Corrupt, incomplete and future-version themes fall back safely.

Continue feature and UX development through the browser/Termux loop. Establish the theme API before permanent branding, without making APK packaging a prerequisite.

Refactor the existing 0.8 appearance without changing its rendered result. The current design becomes the first built-in compatibility theme rather than the permanent definition of the brand.

Component CSS should consume semantic roles covering:

- canvas, surfaces and elevation;
- primary, secondary, subtle, reading and narration text;
- borders and focus;
- action, on-action, links and selected state;
- success, warning and danger;
- user and assistant messages;
- scrim and shadow;
- character accent, on-accent, glow and intensity.

Theme packages may control:

- colors;
- UI and reading typography;
- component, card, sheet and avatar geometry;
- opaque/glass surface treatment, blur and elevation;
- message presentation;
- a semantic icon-pack identifier and stroke/fill treatment;
- portrait-derived, fixed or disabled character accents;
- small bounded motion that respects reduced-motion settings.

Themes may not control DOM order, navigation, functional semantics, essential visibility, dialog behavior or minimum hit areas.

Implementation requirements:

- allowlisted, versioned theme manifests rather than arbitrary CSS;
- required-role validation and safe fallbacks;
- contrast and character-accent validation;
- live preview before committing a theme;
- a recovery/safe-reset path outside the themed surface;
- durable, exportable theme selection and settings;
- a semantic icon registry such as `icon('home')`, `icon('send')` and `icon('settings')`.

Foundation acceptance:

- ordinary feature work retains the fast edit/reload/test loop;
- the current charcoal/brass appearance renders equivalently after refactoring;
- component styles no longer depend directly on `--brass` as action, focus, link and brand simultaneously;
- themes cannot shrink accessible hit targets or hide recovery controls;
- one broken or incomplete theme cannot make the interface unrecoverable.

## Milestone 3: Layout v4 product and visual pass

**Status: browser/Termux release candidate completed 19 November 2026; see the [implementation report](MILESTONE_3_IMPLEMENTATION_REPORT.md). Real-phone browser and packaged WebView qualification remain outstanding. This pass excludes extension integration.**

Layout v4 is the next major product milestone, not a cosmetic cleanup after the theme work. Build structure, interaction and visual range together so the new layout does not quietly hard-code Hearth, while the theme contract is exercised against real screens instead of abstract token samples.

Authoritative product decisions and remaining detail live in [Layout v4](LAYOUT.md). The parked extension questions live in [Extension integration](EXTENSION_INTEGRATION.md). Those documents may evolve during implementation, but superseded 0.7/0.8 handoffs do not regain authority.

### Product structure

- use configurable bottom navigation with Home centered by default and destinations for WI, Home, Chats, Library and an official Extensions hub; exact default order remains a detailed design choice;
- make Home the operational starting point for connection state, preset/generation access, continuing recent conversations and starting a new chat;
- open Library directly to Characters or Personas through top-level tabs, with full editors and no intermediate landing page;
- replace the old grouped Settings screen with an Android-style category index and dedicated Connection, Presets & generation, Appearance, Layout & reading and About pages;
- retain explicit chat-header tools while retiring header/composer swipe side panels and duplicate entrances;
- replace persistent character Read/Edit modes with a stable reading page and explicit Save/Cancel editing;
- preserve the base World Info editor, while treating WIhero as an optional extension workspace rather than a forked Pocket feature;
- reserve an Extensions destination without claiming general compatibility before the dedicated hosting investigation succeeds.

### SillyTavern ownership and migration

- follow native SillyTavern connection, model, preset and generation behavior instead of maintaining Pocket-owned global/character/chat configuration copies;
- first prove that original ST connection controls and handlers can be hosted in the existing engine document with Pocket framing and mobile adaptation—do not clone forms or start a second engine;
- design a deliberate migration that preserves existing Pocket customizations before removing old ownership and scope behavior;
- account for both Chat Completion and Text Completion paths, including API-specific presets and formatting tools;
- keep extension work inside actual ST and prove synchronization, routing, Back/focus behavior and target ownership before promising a general host contract.

### Visual development within the layout pass

Use every implemented screen as a theme-contract test. Visual decisions belong in the Layout v4 design process rather than a later reskin.

- preserve **Hearth** as the dark compatibility/reference theme and **Light Paper** as the existing light, compact, low-effect proof;
- add a dark character-lit treatment and at least one strong geometry/material stress theme while the new components are still being shaped;
- test reading and messenger message presentations without allowing themes to move navigation, hide capability or reduce accessible hit targets;
- design phone and tablet composition deliberately; do not scale the phone layout upward;
- validate small width, large text, reduced motion, light/dark schemes, long content, low-resolution portraits and browser/WebView behavior throughout the pass;
- make shape grammar, hierarchy, portrait treatment, persistent-chrome budget and context-capacity signaling coherent across themes;
- implement the approved Appearance flow: active-theme preview, theme cards, whole-interface preview with Apply/Cancel, personal copies, import/export and theme-only reset;
- keep layout/reading preferences above theme presentation where they overlap, including the global reading/messenger selection;
- import SillyTavern themes as reviewed color mappings onto a safe Pocket base theme; never ingest arbitrary ST CSS or silently accept unreadable combinations.

Acceptance:

- the approved Layout v4 destinations, Home hierarchy, Library structure, Settings topic pages, character flow and explicit chat tools work through the existing browser/Termux loop;
- native ST connection and preset behavior is either hosted successfully or a documented fallback is chosen from observed evidence, without duplicated configuration ownership;
- existing Pocket-scoped configuration data has an explicit tested preservation/migration path before old behavior is retired;
- Appearance exposes preview, Apply/Cancel, import/export and recovery without making a broken theme capable of trapping the user;
- Hearth, Light Paper and the additional stress themes keep the same functions usable while feeling materially different;
- representative screens pass at phone and tablet widths, large text and reduced motion, with accessible targets and no theme-dependent navigation;
- extension and WIhero entrances degrade to honest placeholders or the base WI editor until their contracts are actually proven;
- automated behavior tests, reproducible visual references and focused real-device/browser checks cover each migrated vertical slice.

## Milestone 4: package a stable Pocket milestone

After Layout v4 reaches a stable browser/Termux checkpoint, bundle the same frontend, bridge and required patched extension with SillyTavern. The Kotlin-hosted WebView opens `/st-mobile/`; the full native ST interface remains an explicit diagnostic escape hatch rather than the default product.

Required work:

- add Pocket assets to the reproducible engine bundle without forking their source;
- use one build manifest for APK, frontend, bridge, ST and Node versions;
- fail visibly when frontend and bridge versions do not match;
- preserve ST ownership of characters, chats, presets, personas, World Info, provider secrets and generation;
- retain the browser harness against the same packaged assets;
- translate startup/engine failures into Pocket-level recovery screens rather than exposing raw ST or JSON errors.

Acceptance:

- Home, Chats, Library, World Info, Extensions, Settings and chat open inside the Kotlin-hosted WebView with the same routing and fallback behavior as the browser build;
- mock Send, streaming, Stop, alternatives, edits and durable saves work;
- browser and APK runs use the same frontend/bridge source rather than forks;
- the selected themes and layout/reading preferences render equivalently in browser and WebView;
- hosted native ST tools preserve focus, Back and persistence behavior in the WebView;
- an APK snapshot can be produced without changing the daily web-development workflow.

Repeat this packaging checkpoint only for milestones where Android evidence is useful.

## Milestone 5: native integration and migration hardening

Complete this work when approaching an installable beta or when a product feature depends on native behavior.

Required work:

- map Android Back through the Pocket navigation stack: keyboard, dialog, sheet, editor, screen, then app;
- handle IME resize, cutouts, status/navigation bars and safe areas;
- support file import, export/download, clipboard and external links through explicit WebView policies;
- add generation-scoped wake-lock behavior rather than a permanent wake lock;
- make foreground-service notification state accurate and actionable;
- replace the openly reachable localhost surface with a private, authenticated gateway or equivalent protection;
- define restart behavior for WebView loss, runtime-process loss and full app-process loss;
- keep user data separate from engine/application code and make backup/restore verifiable;
- provide an explicit importer for an existing Termux `default-user` folder without merging or overwriting silently;
- audit storage growth, low-space failure, corrupted archives and interrupted imports.

Acceptance:

- the Android keyboard and gesture/button Back pass on a physical phone;
- background generation behaves honestly and can be stopped from the notification;
- another application cannot issue useful requests to the local ST server;
- imports, exports and backups use Android system surfaces and survive cancellation;
- reinstall/update/recovery behavior is documented and reproducible.

## Milestone 6: naming and branding

Choose the permanent product identity only after theme experiments reveal what is truly characteristic of the experience.

Required decisions:

- product name and availability checks;
- brand promise and voice;
- launcher icon, monochrome/adaptive icon and wordmark;
- signature visual motif;
- default theme and onboarding appearance;
- relationship between product accent and per-character accent.

`Pocket Tavern` must be treated as a working name until the existing overlapping Android AI-character product at `pockettavern.com` is resolved. The current PWA “P” and Android brass cube are implementation placeholders, not protected identity assets.

Acceptance:

- the chosen name is legally and commercially plausible;
- launcher/adaptive/monochrome assets work at Android sizes and system treatments;
- branding selects and tunes the default theme without contaminating the semantic theme API;
- third-party and open-source attribution remains clear.

## Milestone 7: beta hardening and release

Required work:

- signed release builds and a documented reproducible-build path;
- upgrade/migration tests across every public beta schema;
- crash reporting and diagnostics that are opt-in and redact chats, keys and character data;
- accessibility pass with TalkBack, large fonts, contrast and reduced motion;
- performance and battery measurements on representative low/mid/high Android devices;
- offline operation, provider failure and engine-recovery testing;
- source distribution and AGPL compliance for every shipped binary;
- a rollback path and data export before destructive migrations.

The browser/Termux package may be retired only after the APK passes the recovery, import/export and real-phone checklists and a fallback release is retained.

## Immediate next actions

1. Plan Layout v4 implementation on `dev` as a sequence of independently testable vertical slices. The plan must include migration and rollback boundaries rather than proposing a one-shot rewrite.
2. Begin with the highest-risk feasibility work: hosting original ST connection controls in the existing engine document, mapping current Pocket-owned configuration data and proving representative Chat Completion and Text Completion behavior.
3. Design the new navigation, Home, Settings, Library and character flows alongside Hearth, Light Paper and the new visual stress themes. Do not postpone tablet, large-text or theme-range checks until the end.
4. Keep extension integration as a dedicated evidence-driven track. Use WIhero as a concrete workspace-hosting stress case while retaining Pocket's base WI fallback.
5. Keep the validated Android host bounded during ordinary product work. Package Layout v4 only when a stable browser/Termux checkpoint makes WebView evidence useful.

This keeps the eventual APK technically credible without imposing Android’s slower build/install/debug cycle on functions and design work that do not need it.
