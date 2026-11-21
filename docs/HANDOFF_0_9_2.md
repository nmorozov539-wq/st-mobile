# STM 0.9.2 transition handoff

21 November 2026. **No new application functionality.** This checkpoint preserves the 0.9.1 implementation while preparing the next development phase. Technical identity for that phase is `stm`; temporary display name is `STM`.

## Delivered

- Preserved implementation baseline: `0919ea64d37e61229300004da8d49028e8a7573e`, tagged `v0.9.1`.
- Product package, frontend, bridge, cache identifiers and matching release assertions aligned to 0.9.2.
- One current roadmap, architecture decision record, feature inventory and implementation preflight.
- Superseded Android roadmap and old extension/mobile/layout execution plans removed. Recover their original versions from `v0.9.1`.
- Follow-up cleanup removes historical reports, screenshot folders, original AI proposals and accumulated technical/test notes from the active tree. They remain recoverable at `v0.9.2`. A current design brief replaces the old layout discussion; the theme contract remains.

The cleanup correction is committed after the published `v0.9.2` tag on `dev`, still at product version 0.9.2. Use the latest `dev` for handoff; the published release tags are unchanged.

## First task for the next coding chat

Read [the roadmap](FOUNDATION_ROADMAP.md), [implementation preflight](PREPARATION_0_9_2.md), [architecture decisions](FOUNDATION_ARCHITECTURE.md) and [reuse inventory](FOUNDATION_REUSE.md), in that order. Complete the preflight before starting the 0.10 foundation. Do not resume an old milestone plan.

The user's required product shape is an installable ST interface extension, usable in an ordinary browser, plus optional Android capabilities from the APK. Preserve design intent and useful features. Support unmodified extensions without privileged adapters or author cooperation. Group chats are excluded; slash commands and tools are included.

## Explicitly outstanding

- Remove Pocket naming from active first-party code and packaging, with verified data transition, before 0.10 implementation begins. This transition-only release does not attempt that migration or silently change storage keys.
- Qualify ST 1.19.1 at `82b64a45c34facbc98ff4b9f33c067d3ccab6a17`. Current browser guard and Android pin still target **1.19.0**; 0.9.2 is not a 1.19.1-compatible implementation claim.
- Resolve native versus separately rendered chat through comparative trials. Native composer preservation is a leading candidate, not a tested decision.
- Finish phone polish and future platform work through the new roadmap, not an unlimited cleanup pass.

The Android host retains its existing `0.0.2-step2` build identity. No new APK release or device qualification is claimed; 0.9.2 identifies the repository/browser transition. Existing runtime filenames retain their old identity until preflight, so operational instructions still use those real filenames.

## Validation

- `npm test`: 351 passed, 0 failed. The initial restricted run could not bind localhost ports; the rerun with localhost access passed all tests.
- `python3 scripts/build-phone-package.py`: 0.9.2 package built successfully; packaged assets and release versions are verified by the staging tests.
- Active documentation links and `git diff --check`: passed.
- Executable-source diff audit: release-version substitutions only; no behavior changes.

No new live-provider, browser UI or real-device qualification is claimed for this metadata/documentation transition. Build the package from the final tagged commit to obtain matching source provenance. Generated ZIPs are not committed.
