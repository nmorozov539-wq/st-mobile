# Android Milestone 1 physical-phone validation

Date: 18 November 2026

## Build under test

- Branch: `milestone1/bounded-runtime-log`
- Commit: `b1b793ebbf7de32a99df5d9e028dfc79d1165669`
- CI: [Android debug APK run 44303995381](https://github.com/nmorozov539-wq/st-mobile/actions/runs/44303995381)
- Package/version: `app.pockettavern.debug`, `0.0.2-step2` (`versionCode` 2)
- arm64 APK: `pocket-tavern-step2-arm64-v8a-debug.apk`, 167,239,745 bytes
- arm64 SHA-256: `7c1c50feef5bafd49c50beb0fa28c80801efc467402fbd63540fc60492785609`
- x86_64 SHA-256: `1cfd562925ce985e57940b241f0d5afef5077329bb76dc3b10b4c76043763887`

CI built both ABI APKs. The API 34 x86_64 emulator smoke test passed at the same commit: first boot 74 seconds, warm boot 5 seconds. Its private engine tree was 416 MiB and its separate home/data tree was 30 MiB on both runs.

## Physical device

- Xiaomi 2201116SC (`veux`, Redmi fingerprint)
- ABI list: `arm64-v8a,armeabi-v7a,armeabi`
- Reported Android release/API: 16 / 36
- Build fingerprint: `Redmi/veux_eea/veux:13/TKQ1.221114.001/V816.0.13.0.TKCEUXM:user/release-keys`
- Battery at start: 75%, AC powered
- Transport: authorized USB ADB

The release property and fingerprint base-version disagree, so both are recorded rather than inferring a different Android version.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Install without Termux | Pass | Checksum-verified arm64 APK installed normally; no Termux dependency was present. |
| Bundled runtime payload | Pass | APK contains `assets/engine/sillytavern.zip` (121,691,707 bytes), `libnode.so` (116,989,272 bytes) and `libpocket_node.so`. No first-start payload download is required. |
| Fresh start | Pass | Runtime process started at device time 17:43:51.199; HTTP first answered at approximately 17:44:50, about 59 seconds later. Activity cold display was 1.689 seconds. SillyTavern 1.19.0 showed its welcome page. |
| Warm start | Pass | Full force-stop/reopen displayed the activity in 980 ms and returned HTTP 200 after about 8 seconds with a new runtime PID. |
| Background/foreground | Pass | Runtime PID stayed unchanged and HTTP stayed 200 after 20 seconds on the baseline APK and 15 seconds on the final patched APK. Patched hot return was 81 ms. |
| Screen lock/unlock | Pass | Runtime PID and HTTP 200 survived 20 seconds screen-off/secure-keyguard; after the user unlocked normally the WebView resumed and remained usable. |
| Runtime-process loss | Observed limitation | Deliberately crashing only `:runtime` removed the process and HTTP service; neither returned during a 60-second observation. A full app stop/reopen recovered normally. This is consistent with the current `START_NOT_STICKY` design. |
| Full app stop/reopen | Pass | Repeated force-stop/reopen cycles recovered the engine and UI. |
| Code/data separation | Pass within current scope | Android reports code under `/data/app/...` and data under `/data/user/0/app.pockettavern.debug`. The engine implementation further separates replaceable `files/engine/sillytavern/` from `files/engine/home/`. A saved default profile survived full app stop/reopen and the welcome form stayed dismissed. |
| Logs bounded | Pass after fix | `b1b793e` routes Node output through a private rotating writer: `runtime.log` and `runtime.log.1`, each capped at 1 MiB. A native harness sent 2.5 MiB through the exact implementation and produced 1 MiB plus 512 KiB files. CI and the physical phone booted with the new bridge. |
| Logs free of secrets | Pass for exercised paths | Physical app-process logs and emulator runtime logs were scanned for key, authorization, bearer, password, credential and secret patterns. No secret values or user content appeared. The runtime log's “Cookie secret is missing... Generating” line contains no secret. |
| Data wipe | Controlled | The first CI APK and the patched CI APK used different ephemeral debug signing keys, so Android rejected in-place update. After explicit user confirmation, only the test package was uninstalled; the recreated default `User` profile is the only retained test state. |

The phone ROM blocks `run-as` for this debuggable package with an SELinux context error. Direct inspection of private files on this phone was therefore unavailable; app-private path/mode came from package metadata and source, while sizes and runtime logs came from the matching CI emulator artifact.

## Remaining native risks

- A killed `:runtime` process does not recover until the full app is reopened.
- CI debug artifacts are signed with ephemeral keys and cannot update one another in place. Stable beta/release signing is required before testing real APK upgrades and migrations.
- The current server is deliberately Step 2 scope: another app on the phone can address `127.0.0.1:8123`; the private socket/token gateway remains future work.
- Wake locks for long generation, WebView downloads/exports, backup/import, low-space behavior and production update/migration remain deferred.
- The Xiaomi ROM's `run-as` denial reduces on-device diagnostic access but did not affect installation, runtime, WebView, foreground service or persistence behavior.

## Conclusion

Milestone 1 acceptance is met at `b1b793e`: both CI ABIs build, the emulator boots, and one physical arm64 phone completed fresh/warm start, background, secure lock/unlock, runtime-loss observation and full reopen without moving product development away from the browser/Termux loop. Native work may pause with the risks above carried forward.
