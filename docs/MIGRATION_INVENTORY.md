# Legacy state inventory for the 0.9.1 transition exporter

21 November 2026. Discovery evidence for PREPARATION_0_9_2.md; not final. Found by grepping `dev` at 97f9c27.

## Frontend origin (localStorage; IndexedDB is not used)
| Key | Holds | Notes |
|---|---|---|
| `pocket-tavern.v1.drafts` | unsent drafts keyed by `[characterKey, chatId]` | must migrate |
| `pocket-tavern.v1.target` | last open chat | optional |
| `pocket-tavern.v1.pending` | in-flight operation journal | never replay |
| `pocket-tavern.pending-changes.v1` | unconfirmed change journal | export as inert, never replay |
| `pocket-tavern.appearance.v1`, `.layout.v1`, `.themes.v1`, `.color-themes.v1` | appearance, layout, themes | must migrate |
| `pocket-tavern.lists.v1`, `.wi-folders.v1`, `.wi-view.v1` | list prefs, World Info folders and view | must migrate |
| `pocket-tavern.direct-endpoint.v1` | direct endpoint | migrate, flag as possibly sensitive |
| `pocket-tavern.char-colour.v2`, `.diagnostics.v1`, `.undo.v1`, `.tools-notice` | caches, diagnostics, transient | do not migrate |

## ST-owned data carrying the old name (written by the extension)
- `extension_settings.pocket_tavern` (version 3: `global`, `collections`, `migration`) and `extension_settings.pocket_tavern_repairs`.
- Character card `data.extensions.pocket_tavern` (`color`, `settings`).
- Chat metadata `pocket_tavern` (`newChat`, `memoryInvalid`, `settings`).
A plain rename orphans all three. The neutral importer needs an explicit ST-side conversion step.

## Filesystem artifacts (launcher/updater, `.pocket-*`)
`.pocket-tavern.json`, `.pocket-proxy`, `.pocket-wasm`, `.pocket-backups`, `.pocket-base`, `.pocket-logs`, `.pocket-updater`, `.pocket-update*`, `.pocket-launcher.lock`, `.pocket-lifecycle*`, `.pocket-installed-manifest.json`, `.pocket-prepared`, `.pocket-shell`.

## Engine pin sites (1.19.0 to 1.19.1)
`android/sillytavern.properties`, `android/README.md`, `phone-package/{package-staging,compatibility,import-data,prepare-test,update-core,update-test}.cjs`, `prototype/extension/{index,configuration-state,character-book}.js`, `prototype/frontend/engine-health.js`, `scripts/{prepare-pc-sandbox,patch-pc-tokenizer}.py`, `THIRD_PARTY_NOTICES.md`.
The compatibility patches match exact 1.19.0 source and refuse to apply otherwise, so 1.19.1 needs real re-qualification.

## Android
Package `app.pockettavern` (Kotlin dirs and JNI symbols). A new application ID is a separate app identity with no access to the old app's private data.

## Decision record
- 21 November 2026, user (confirmed in thread): use `app.stm` as the Android package ID during development. It is provisional, not the final name. Android build and device work stays deferred until the Termux setup is working and polished, so only the source rename is in scope, not a new APK.
