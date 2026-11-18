# Pocket Tavern

Pocket Tavern is a phone-focused interface for [SillyTavern](https://github.com/SillyTavern/SillyTavern). SillyTavern remains the engine that owns characters, chats, settings, prompt building, and generation; Pocket Tavern provides the smaller mobile interface around it.

The project has two delivery paths:

- **Termux/web:** the main feature-development environment and currently the most complete way to run Pocket Tavern.
- **Android APK:** a thin Android host intended to bundle the same web interface and a local SillyTavern runtime without requiring Termux.

## Branches

- `main` contains stable integration work and the Android/APK build.
- `dev` contains active Termux/web development, including unfinished interface and theme work. Finished iterations move to `main` before an APK is packaged.

## Repository map

- `android/` — Android host and APK build
- `prototype/frontend/` — Pocket Tavern interface
- `prototype/extension/` — bridge to SillyTavern
- `phone-package/` — Termux installation and update tools
- `scripts/` — development and packaging helpers
- `tests/` — automated checks

## Basic commands

Run the automated checks:

```sh
npm test
```

Build a Termux phone package:

```sh
python3 scripts/build-phone-package.py
```

Build a debug APK (JDK 17 and the Android SDK/NDK are required):

```sh
cd android
./gradlew assembleDebug
```

See [android/README.md](android/README.md) for Android requirements and [phone-package/PHONE-README.md](phone-package/PHONE-README.md) for the Termux workflow.

## Status

Pocket Tavern is still under development. Keep backups of important SillyTavern data and treat development builds as test software.
