# Mobile correction implementation report

Date: 20 November 2026. Candidate: Pocket Tavern 0.9.1, uncommitted. Baseline: `dev` at `d8d68d3`.

## Outcome

The reported phone failures now have executable corrections: folded World Info renders as a complete Library workspace and returns from editors to its captured origin; bottom navigation distributes only visible destinations; Messenger produces bounded, directionally aligned bubbles; chat chrome has one menu and a composer model control; all configuration entrances use the native-owned tool; and original ST controls are presented in a Pocket-scoped mobile host.

The follow-on collection work replaces persistent chat/tag rows with compact sheets, adds explicitly applied AND-based multi-tag filtering, and stores one-level character folders in a versioned `extension_settings.pocket_tavern.collections` record. The organizer fails closed on malformed/future schemas, preserves unknown fields, serializes mutations, checks durable revisions before writing, verifies saved readback, and enters a reconciliation lock after an unreadable save outcome. Folder deletion only removes assignments. Import now performs picker-side type/30 MiB validation, retains the same bridge-side guard, uses multipart without base64 conversion, and assigns validation to the import dialog rather than a global toast. Character color is an explicit Automatic/Custom mode with Save/Cancel; Automatic uses SillyTavern's native unset marker so the stored override is actually removed.

Home now uses a two-cell configuration group, one Continue action, at most three compact recents and one Start action. The empty state has one Add-character action.

## Acceptance matrix

| Report | Observable result | Evidence |
|---|---|---|
| Folded WI became blank or lost tools | Populated folded workspace renders; entry Back returns to Library/WI; four visible nav items fill equal tracks | `slice-1-live.json`, `folded-wi-library.png` |
| Messenger appeared unchanged | Same transcript has content-sized bounded bubbles and opposing alignment; Reading remains a shared column | `slice-1-live.json`, `messenger-hearth.png`, `messenger-nocturne.png` |
| Header/preset controls were crowded or duplicated | Header retains Back, identity and one overflow; model selector sits in composer; old scoped editor is not an ordinary route | native journey assertions |
| Native configuration looked raw or failed Back | Original Connection/CC/TC controls use Pocket variables; prompt fields reflow to one column; visible Save/Cancel; nested Back closes the popup first and no error surface remains | four `native-live-*.json` records and twelve matching captures |
| Build appeared stale | DOM version, app script and every stylesheet carry 0.9.1 in the staged fixture | `slice-1-live.json` asset identity |
| Chat/tag controls consumed space | Chat grouping and tag choices open compact sheets; groups start collapsed; tags use labeled Match-all semantics | `collections-live.json`, `phase4-6.test.js` |
| Character organization was missing | Folder create/move/filter has verified ST-settings readback; fresh-runtime reads retain it; future/malformed schemas and stale revisions fail closed; delete returns assignments to Unfiled | `collections-live.json`, `collection-organizer.test.js` |
| Import icon/error/limit were misleading | Visible Import label uses import glyph; over-30 MiB files show the exact local size once with no mutation/global toast; a valid safe-size card completes the real native importer and reads back | `collections-live.json`, `native-import-live.json`, `asset-store.test.js` |
| Character color looked like a gold default | Save/Cancel and Automatic/Custom are explicit; Cancel does not write; Automatic removes the stored override on native readback | `character-colour-live.json`, `character-colour-automatic.png` |
| Home was unnecessarily tall | Default 320/390 Hearth/Nocturne cases have `scrollHeight <= clientHeight`, two config rows, at most one Continue/Start and three recents | `home-live.json` and four captures |

## Native checkpoint details

The hosting mode is truthfully reported as `pocket-themed-native`: Pocket presents SillyTavern's original controls inside a scoped mobile surface, but does not claim a fully native SillyTavern page. The host never clones settings forms or save logic. It temporarily scopes presentation CSS, guards interaction outside the owned roots, preserves ST handlers, waits for verified native save on close, and restores the document afterward. The matrix runs Connection, CC prompt editor and TC formatting at 320 and 390 pixels in Hearth and Nocturne. Each case edits and reads back native values, closes a nested prompt before its host, returns to the captured origin, and asserts both JavaScript errors and visible alert/toast/error owners are empty.

## Import-size finding

The candidate retains the 30 MiB guard. The current path transfers the `File` through the bridge and appends it directly to `FormData`; it does not encode the payload as base64. A real valid ~1 MiB v2 JSON card completed SillyTavern's native importer and read back with its 1 MiB payload intact. A valid 31 MiB card reached the real native endpoint and started import, but SillyTavern then terminated near a 2,037 MiB V8 heap with an out-of-memory error. Raising the guard to 32 or 64 MiB would therefore be unsupported and unsafe on this pinned runtime. `native-import-limit-investigation.json` records the failure; `native-import-live.json` records safe-size success, malformed-server rejection, local boundary rejection and RSS samples.

## Installation and update qualification

The actual `pocket-tavern-combined-v0.9.1.zip` was extracted, prepared and launched. Its manifest, frontend, bridge and README versions matched 0.9.1; the installed UI exercised fresh, preservation-pending and native configuration routes; mock generation saved and survived reload; Paper/Messenger preferences and an ST-backed character folder survived reload. Separately, the Git updater installed a staged candidate over an exact `d8d68d3` / 0.9.0 package fixture, preserved a hashed user-data file, launched and generated through the mock provider, then rolled back to the byte-matched baseline. See `zip-installed-roundtrip.json` and `git-update-roundtrip.json`.

## Remaining qualification

- Real Android/WebView behavior, memory pressure at the upper import boundary, IME, system Back and screen-reader behavior require the user's phone.
- Paper and Monolith remain smoke-test themes; the exhaustive native matrix targets Hearth and Nocturne as requested.
- No commit, push, merge or publication was performed.

## Verification result

`node tests/run.js` passes 351/351 with loopback binding enabled. The focused real-fixture journeys also pass for slice 1, the four-case native matrix, tag/folder/import behavior, character colour, Home density, actual ZIP installation and the exact-baseline Git update/rollback. `python3 scripts/build-phone-package.py` produced `dist/pocket-tavern-combined-v0.9.1.zip`; shared staging/updater tests pass with matched frontend, bridge, manifest and README versions.
