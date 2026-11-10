# Pocket Tavern for Android (Step 1 spike)

Proves that Node.js 22 runs **in-process** (libnode via JNI) inside the app's own `:runtime`
process, started by a foreground service. No SillyTavern yet.

- `app/src/main/assets/engine/server.cjs`: tiny HTTP server on `127.0.0.1:8123` showing Node's version,
  arch and a once-a-second counter.
- `EngineService` (`:runtime` process): unpacks the script and calls `node::Start` on a thread.
  Node can start only once per process, so stopping the engine kills that process.
- `MainActivity`: shows "Starting…", polls the port every 200 ms (30 s timeout), then opens a WebView.
- The prebuilt runtime is downloaded at build time and checked against the SHA-256 in
  `node-runtime.properties` (build fails on mismatch). See `../THIRD_PARTY_NOTICES.md`.

Build: Android SDK with NDK 28.2.13676358 and CMake 3.22.1, JDK 17+, then `./gradlew assembleDebug`.
Outputs one APK per ABI (`arm64-v8a` for phones, `x86_64` for emulators).
CI: `.github/workflows/android.yml`.
