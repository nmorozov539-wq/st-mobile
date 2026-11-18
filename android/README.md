# Pocket Tavern for Android (Step 2: bundled SillyTavern)

Runs **unmodified SillyTavern 1.19.0** on Node.js 22, **in-process** (libnode via JNI) inside the app's own
`:runtime` process, started by a foreground service. No Termux. The WebView shows SillyTavern's own UI.

- Build time: `scripts/prepare-sillytavern.mjs` fetches the commit pinned in `sillytavern.properties`, runs
  `npm ci --omit=dev`, and prunes files not used at runtime. Gradle zips the result into
  `assets/engine/sillytavern.zip` with a `sillytavern.version` stamp (version + zip SHA-256).
- First start (and after an update that changes the stamp): `EngineService` unpacks the zip into
  `files/engine/sillytavern/` (staging dir, then swap). User data lives in `files/engine/home/`
  (`config.yaml`, `data/`) and is never touched by an update.
- Then it calls `node::Start` with `server.js --port 8123 --listen false --browserLaunchEnabled false
  --configPath home/config.yaml --dataRoot home/data`, with `HOME`, `TMPDIR` and `NODE_ENV=production` set.
  On the very first start SillyTavern compiles its frontend libraries with webpack (cached in `data/_webpack`).
- `MainActivity`: shows unpack / start progress (from `files/engine/state` and the last log line), polls
  `127.0.0.1:8123` and opens SillyTavern full screen. File inputs open the system picker; external links
  open in the browser. Stop the engine from the notification.
- Node can start only once per process, so stopping the engine kills the `:runtime` process.
- The prebuilt Node runtime is downloaded at build time and checked against the SHA-256 in
  `node-runtime.properties` (build fails on mismatch). See `../THIRD_PARTY_NOTICES.md`.

Not yet (later steps): Pocket Tavern frontend, private socket + token gateway (for now any app on the phone
can reach `127.0.0.1:8123`), wake lock while generating, exports/downloads from the WebView, backup.

Build: Android SDK with NDK 28.2.13676358 and CMake 3.22.1, JDK 17+, git and Node.js 20+ (npm) on PATH,
then `./gradlew assembleDebug`. Outputs one APK per ABI (`arm64-v8a` for phones, `x86_64` for emulators).
CI: `.github/workflows/android.yml` builds the APKs and boots the x86_64 one on an emulator
(`scripts/emulator-smoke.sh`), uploading screenshots and the engine log.
