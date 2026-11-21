# STM feature reuse and migration inventory

Updated 21 November 2026. Initial source-based dispositions for the new foundation. “Retain” preserves behavior/design, not an assurance that implementation can be copied unchanged. Each row requires evidence before retirement of its old path.

| Existing area | Sources | Disposition | Preservation gate |
|---|---|---|---|
| Navigation, fans, sheets and responsive layout | frontend navigation, chat-controls, side-panels and layout CSS | Adapt around selected native surfaces | Retain entrances, return paths, touch usability and intended design |
| Themes, icons, typography and reading modes | themes, tokens, appearance, color-theme, icons, fonts | Reuse assets/contracts; rename identifiers; adapt selectors | All built-in themes, user overrides, recovery and reading/Messenger presentation |
| Chat/composer/rendering | app, html-format, regex-display; extension runtime/alternative | Architecture-dependent replacement | Draft, selection, formatting, media, streaming, edit/swipe and extension controls |
| Transport and adapter | transport, adapter, bridge-contract, extension index | Replace cross-frame dependence where obsolete | Target checks, operation lifecycle and errors survive simplification |
| Persistence and recovery | journal, persistence, engine-health/monitor | Reuse safeguards; adapt state ownership and storage identity | No replayed send, lost pending changes or false save confirmation |
| Home and connection/presets | home, model/preset panels, native-settings-host, configuration | Adapt; retain ST-owned configuration | All entrances reach one native configuration owner, with verified close and recovery |
| Legacy scoped configuration | scoped-settings, configuration-migration and migration page | Transition/export before retirement | Preserve records and prove readback; do not silently reset |
| Library, characters and personas | library/libraries, character modules, assets, persona-selection | Reuse logic selectively; adapt views and ST access | CRUD/import/export, associations, target guards and saved state |
| Chats, folders and collections | character-chats, lists, collection-organizer, workspace | Adapt | Search, organization, selection and deletion target the intended records |
| World Info | world-info, wi-entry/ui/activation, worldinfo runtime | Preserve base functionality; adapt | Folded/unfolded entrances, entries, activation, save and return navigation |
| Memory-specific product UI | memory files; vendor Summaryception patch | Retire privileged integration after preservation | Ordinary extension access, retained extension data and generic activity safeguards |
| Extension integration | native host, existing extension registry | Replace special cases with tested shared mechanisms | Settings/actions/panels and mutation coordination without per-extension branches |
| Error reporting and diagnostics | error-record/message, native-notices, launcher diagnostics | Reuse model; adapt ownership | One visible notification owner; useful recovery/logs without secrets |
| Browser/Termux installation and updates | phone-package, staging/build scripts | Rename during preflight, adapt to shared artifact in 0.10 | Update/restart, provenance, data separation and independent extension updates |
| Android host | MainActivity, Engine, EngineService, NodeRuntime and JNI | Retain platform foundations; rename coherently; add capability connection | Boot, lifecycle, file picker, Back and private data migration |
| Proxy support | or-proxy and proxy tests | Audit; no automatic retirement | Record which provider flows depend on it before replacing/removing |
| Tests and evidence | tests and docs evidence directories | Reuse behavioral cases; replace obsolete structural assertions | Old evidence remains attributed to its original revision |

## Migration record required for each slice

Record old entrance/state owner, new entrance/state owner, retained behavior, renamed data, validation evidence and removed files. State explicitly whether user data moved, was imported or stayed ST-owned. A deferred feature stays visible in the backlog with an acceptance consequence; it does not disappear from the inventory.

## Naming and historical material

Active code, tests, executable paths, manifests and generated release assets must use the STM identity before 0.10. Historical plans and screenshots may retain old names as evidence; the active documentation entry points use STM. Legacy-name migration code is retained only in the transition release/history, not as aliases embedded in the new foundation. Preserve third-party attribution and do not rewrite upstream projects for branding.
