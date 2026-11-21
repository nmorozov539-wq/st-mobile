# STM implementation preflight after the 0.9.2 handoff

Updated 21 November 2026. Remaining coding preflight, not work delivered in the transition release. The user designated 0.9.2 as a cleanup and handoff checkpoint with no new functionality. Finish runtime naming, migration and engine gates before beginning the 0.10 foundation. Technical identity: `stm`; temporary display name: `STM`.

## Baseline preservation

The transition handoff preserves the existing implementation at `v0.9.1`. See [the handoff](HANDOFF_0_9_2.md) for release verification. Remaining items below belong to the next coding pass, before 0.10.

## Inventory and rename active first-party code

- [ ] Enumerate case-insensitive old-name occurrences in tracked contents and paths, including compound names and abbreviations whose meaning is the old product. Review generated artifacts separately. An initial broad scan found matches in 141 files across runtime, platform, scripts, tests and delivery sources; this is discovery evidence, not a final rename count.
- [ ] Adopt `stm` for module/global/protocol/storage naming, `stm-*` for project CSS identifiers, and `STM` for human-facing temporary labels. Audit short prefixes such as `pt` rather than blindly replacing unrelated text.
- [ ] Rename manifests, HTML/PWA labels, JS globals, iframe names where temporarily retained, selectors, comments, test fixtures, diagnostics, launcher filenames, update paths, distribution filenames and CI artifact labels consistently.
- [ ] Update Kotlin package/namespace, directory paths and JNI symbols together. Proposed neutral namespace/application ID: `app.stm`, pending a collision check and recorded Android migration decision. Package identity must be fixed before 0.10 starts.
- [ ] Update Gradle root name, workflow inputs, install scripts, repair scripts, source URLs where applicable and cache/build provenance. Local repository folder and remote repository rename are separate administrative decisions; neither must be renamed merely to clean code.
- [ ] Keep provenance and legally required third-party attribution intact. Remove the branded patched Summaryception from active packaging; recover its data before removal. Do not rewrite upstream third-party code merely to satisfy the product rename.

Exit: no old product identifiers in active first-party source, tests, scripts, configuration, packaged assets or executable filenames. Do not hide names through string splitting or encoding. Historical docs, immutable tags and attribution are explicit evidence categories, not runtime compatibility aliases. No old-name alias is permitted in the new foundation.

## Preserve data without carrying old aliases into 0.10

- [ ] Inventory legacy localStorage keys, IndexedDB if used, extension settings, drafts, pending-change journals, theme/layout preferences, folders, presets and installed extension state. Actual keys include `pocket-tavern.v1.*` and `pocket-tavern.appearance.v1`; search for all others.
- [ ] Build and qualify a separate transition exporter against 0.9.1 before the final rename. It produces a versioned brand-neutral migration bundle. It must handle the existing frontend origin and ST settings separately and must not replay pending writes automatically.
- [ ] Preserve the legacy exporter in a tagged transition release/artifact. Remove its legacy-name source and fixtures from the active tree before 0.10. The active importer accepts the neutral schema only. Users skipping 0.9.2 must explicitly export through the transition tool first; no silent reset or implicit old-key support.
- [ ] Verify export/import with real-shaped disposable fixtures: drafts, themes, folders, settings, interrupted operations, corrupt bundle, repeated import and rollback. Keep the source installation untouched until readback confirms the imported state.
- [ ] Decide Android migration explicitly. Changing the application ID creates a separate app identity; do not assume direct access to the old app's private data. Verify an export/import route from the old app or document the required transition build before finalizing the new ID.
- [ ] Separate ST-owned chats/characters/lorebooks from interface preferences. Preserve extension-owned data and optional-extension removal behavior. Retain backups and restore instructions independent of the new interface.

## Align ST and build inputs

- [ ] Align the browser runtime guard and Android engine pin with ST 1.19.1 commit `82b64a45c34facbc98ff4b9f33c067d3ccab6a17`. Inspect all development sandbox and package preparation pins too. Changing a version string does not constitute qualification.
- [ ] Exercise the existing baseline against that engine, especially native popups, configuration save/close and generation. Limit fixes to preparation blockers; defer the new interface to 0.10.
- [ ] Establish one product version source for 0.9.2 manifests/assets/builds, with separately recorded Android versionCode, Node runtime and ST revision. Eliminate misleading mixed product versions without conflating their distinct version systems.
- [ ] Validate renamed browser/Termux package staging and Android package/JNI wiring. Record build/device checks that cannot run; do not mark the preparation gate complete while required checks remain outstanding.

## Prepare the repository

Keep the 0.9.1 snapshot in Git rather than creating a second full code copy. In the next coding preflight, rename existing active code in place and keep it runnable. Do not do the architectural rewrite under a housekeeping version.

Proposed 0.10 target structure is `extension/` for the installable ST interface and its assets, `android/` for host/platform code, `scripts/` for artifact preparation, `tests/` for behavior/platform tests and `docs/` for current guidance. Consolidation from `prototype/` happens incrementally during 0.10 after architecture selection. Each slice has one runnable entry point, with dead predecessors removed after verification.

- [ ] Make the new roadmap the documentation entry point; clearly label older roadmap/layout/integration decisions as historical where superseded.
- [ ] Record approved scope, unresolved architecture choices and feature dispositions using the linked foundation documents.
- [ ] Define install/uninstall and native ST recovery for the future extension. Decide how browser/Termux installs and APK packaging consume the same artifact without overwriting independently updated extensions.
- [ ] Review the role of `or-proxy/` and launcher tooling; preserve required behavior until a replacement or explicit retirement decision exists.
- [ ] Commit the reviewed implementation preflight separately and record checks. Start 0.10 only after identity, data, engine and build gates all pass.

## Current status

See HANDOFF_0_9_2.md for completed transition work and validation. Runtime renaming, migration tooling and ST 1.19.1 qualification remain pending. No implementation gate is satisfied merely by publishing 0.9.2.
