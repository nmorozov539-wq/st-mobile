# Third-party notices

Pocket Tavern is licensed under the GNU Affero General Public License v3.0 (see `LICENSE`).
It includes or downloads the following third-party work.

## RodneyCw1/SillyTavern-Android (AGPL-3.0)

- Source: https://github.com/RodneyCw1/SillyTavern-Android (code read at commit f85a224aea7c08d0b51817bcfda5d2c413df4135)
- License: GNU AGPL-3.0
- Used in `android/`:
  - `app/src/main/cpp/node_bridge.cpp` and `app/src/main/cpp/CMakeLists.txt`: adapted; JNI symbol and
    library names changed, comments added.
  - `app/src/main/java/app/pockettavern/NodeRuntime.kt`: JNI declaration adapted from `TavernService.kt`.
  - `app/src/main/java/app/pockettavern/EngineService.kt`: structure (`:runtime` foreground service that
    runs Node on its own thread and kills its process on destroy) adapted from `TavernService.kt`; rewritten.
  - `res/xml/network_security_config.xml` and the manifest's special-use service declaration follow theirs.
- Prebuilt runtime downloaded at build time (not committed), pinned by SHA-256 in `android/node-runtime.properties`:
  `node-22.23.2-android-16k.zip` from their release `runtime-node-22.23.2-16k`. They build it from the
  Node.js source below with their `scripts/build-node22-linux.sh` and `scripts/patch-node22.py`
  (NDK 28.2.13676358, API 29, 16 KB page size).

## Node.js 22.23.2 (MIT and bundled licenses)

- Source: https://nodejs.org/dist/v22.23.2/node-v22.23.2.tar.xz
  (sha256 bbe768df8d5815d7fa76124052985332452e0a4742d39f32027550d1aab8f6fb)
- License: MIT for Node.js itself, plus the licenses of its bundled dependencies (V8, libuv, OpenSSL, ICU,
  and others). The full text ships as `libraries/Node-22-LICENSE` inside the runtime zip and at
  https://github.com/nodejs/node/blob/v22.23.2/LICENSE.
