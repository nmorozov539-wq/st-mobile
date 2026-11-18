# Pocket Tavern: Android, themes and branding roadmap

Status: active, updated 18 November 2026 after repository convergence and Android CI validation.

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

## Starting point and convergence status

The repository histories were converged on 18 November 2026:

- `0.8-phase4-6` at `d9e437b` remains the complete Pocket Tavern 0.8.0 interface, bridge and browser/Termux package.
- `main` at `73113df` remains the Android Step 1 checkpoint, proving pinned Node.js 22 runs in-process in a foreground `:runtime` service and can be displayed through a WebView.
- `claude/project-thread-w10vig` at `f45a36b` remains the Android Step 2 checkpoint, bundling unmodified SillyTavern 1.19.0, separating application code from user data, adding file-picker handling and defining an emulator smoke test.
- `integration/0.8-android-step2` at `cad0d50` now contains the complete web product and Android Step 2 in one inspectable history. Its explicit merge commit preserves both parent histories.

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

The browser/Termux package remains the canonical fast development surface and a compatibility/fallback release until the APK passes its migration and recovery gates. The 0.8 layout is the current baseline, not an immutable final layout.

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
- the unrelated local `.obsidian/appearance.json` modification remains uncommitted and outside this milestone.

## Milestone 1: bounded Android-host validation

**Status: in progress. CI builds and emulator boot are proven; physical arm64 phone validation remains.**

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

## Milestone 2: theme API and continued web-product development

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

Acceptance:

- ordinary feature work retains the fast edit/reload/test loop;
- the current charcoal/brass appearance renders equivalently after refactoring;
- component styles no longer depend directly on `--brass` as action, focus, link and brand simultaneously;
- themes cannot shrink accessible hit targets or hide recovery controls;
- one broken or incomplete theme cannot make the interface unrecoverable.

## Milestone 3: prove theme range and import ST colors

Build deliberately different first-party themes to expose missing roles before documenting the format as stable:

- the current charcoal/brass design, provisionally named **Hearth**;
- a dark theme where character color acts as controlled scene light;
- a light or high-contrast theme;
- at least one geometry/material stress test, such as round translucent glass or an opaque pastel skin.

Add **import-and-convert** support for SillyTavern color themes. Do not ingest arbitrary ST CSS. Map supported ST colors into Pocket semantic roles, normalize alpha where necessary, validate contrast, preview the result and repair or warn about unsafe combinations. Geometry, icons and other Pocket-only roles inherit from a selected safe base skin.

Acceptance:

- the proof themes feel materially different without changing layout or capability;
- the same screen remains usable under every built-in theme at small width and large font scale;
- ST palette import produces a reviewable Pocket theme and never silently installs unreadable colors.

## Milestone 4: package a stable Pocket milestone

At a meaningful product checkpoint, bundle the then-current Pocket frontend, bridge and required patched extension with SillyTavern. The Kotlin-hosted WebView opens `/st-mobile/`; the full native ST interface remains an explicit diagnostic escape hatch rather than the default product.

Required work:

- add Pocket assets to the reproducible engine bundle without forking their source;
- use one build manifest for APK, frontend, bridge, ST and Node versions;
- fail visibly when frontend and bridge versions do not match;
- preserve ST ownership of characters, chats, presets, personas, World Info, provider secrets and generation;
- retain the browser harness against the same packaged assets;
- translate startup/engine failures into Pocket-level recovery screens rather than exposing raw ST or JSON errors.

Acceptance:

- Home, Chats, Characters, Personas, World Info, Settings and chat open inside the Kotlin-hosted WebView;
- mock Send, streaming, Stop, alternatives, edits and durable saves work;
- browser and APK runs use the same frontend/bridge source rather than forks;
- the selected stable appearance renders equivalently in browser and WebView;
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

1. Create the integration branch from `0.8-phase4-6` and merge the Android Step 2 history without changing the daily product workflow.
2. Run the existing web test baseline after convergence.
3. Repair Android CI and complete one bounded emulator/phone validation of bundled ST.
4. Return primary effort to web-first product and theme development.
5. Package the next stable product milestone into the Kotlin host when it provides useful integration evidence.

This keeps the eventual APK technically credible without imposing Android’s slower build/install/debug cycle on functions and design work that do not need it.
