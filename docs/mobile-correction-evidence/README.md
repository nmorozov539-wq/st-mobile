# Mobile correction evidence

This directory contains deterministic browser evidence for the Layout v4 correction candidate, built from source revision `d8d68d3` plus the uncommitted 0.9.1 working changes. The fixture is disposable SillyTavern 1.19.0 with the local mock model; it is desktop Chromium mobile emulation, not a claim of Android/WebView qualification.

## Journeys

- `slice-1-live.json` and `folded-wi-*.png` prove the folded World Info workspace, editor origin, four-track navigation, message-format geometry, and real 0.9.1 asset URLs.
- `native-live-{hearth,nocturne}-{320,390}.json` plus matching screenshots cover Connection, CC prompt editing, TC formatting, save/readback, nested Back, return to origin, Pocket presentation, and absence of visible/page errors.
- `collections-live.json` covers ST-backed folder create/move/filter with verified saved readback, compact collapsed chat grouping, and locally owned oversized-import validation. Fresh-runtime persistence and stale revision behavior are covered by `collection-organizer.test.js`.
- `character-colour-live.json` covers Custom Save, dirty-draft Cancel, native readback, Automatic unset and a second Cancel/reopen check.
- `native-import-live.json` covers a safe-size card through the real native importer, malformed native rejection, local over-30 MiB rejection, no duplicate global toast and process RSS sampling. `native-import-limit-investigation.json` records the real 31 MiB importer OOM that prevents an unsupported limit increase.
- `home-live.json` and four Home captures record no incidental default Home scrolling at 320/390 in Hearth/Nocturne.
- `git-update-roundtrip.json` records the exact `d8d68d3` / 0.9.0 to staged 0.9.1 Git updater, preserved user-data hash, mock generation and rollback. `zip-installed-roundtrip.json` records the actual installed ZIP and includes fresh/pending/native routes plus preference/folder reload.

## Commands

Run against a prepared local fixture on port 8123:

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/pocket-design-browser node tests/mobile-correction-live.cjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/pocket-design-browser POCKET_NATIVE_WIDTH=390 POCKET_NATIVE_THEME=hearth node tests/mobile-correction-native-live.cjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/pocket-design-browser POCKET_NATIVE_WIDTH=320 POCKET_NATIVE_THEME=hearth node tests/mobile-correction-native-live.cjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/pocket-design-browser POCKET_NATIVE_WIDTH=390 POCKET_NATIVE_THEME=nocturne node tests/mobile-correction-native-live.cjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/pocket-design-browser POCKET_NATIVE_WIDTH=320 POCKET_NATIVE_THEME=nocturne node tests/mobile-correction-native-live.cjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/pocket-design-browser node tests/mobile-correction-collections-live.cjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/pocket-design-browser node tests/mobile-correction-character-colour-live.cjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/pocket-design-browser node tests/mobile-correction-native-import-live.cjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/pocket-design-browser node tests/mobile-correction-home-live.cjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/pocket-design-browser node tests/milestone-3-package-live.cjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/pocket-design-browser node tests/followup-integrated-live.cjs /home/Riv/SillyTavern
node --test tests/asset-store.test.js tests/collection-organizer.test.js tests/home.test.js tests/phase4-6.test.js tests/bridge-v2.test.js tests/layout-v4.test.js
```

## Limits

Real-phone memory, Android WebView, IME, system Back and touch accessibility remain for the user's device retest. The import guard remains 30 MiB: the pinned real importer completed a safe-size card but crashed with V8 heap exhaustion on a valid 31 MiB JSON card. This evidence explicitly does not claim 32 or 64 MiB support.
