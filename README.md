# Pocket Tavern development

This is the `dev` branch for active Pocket Tavern work. It is where the Termux/web interface, SillyTavern bridge, themes, and other new features are developed.

SillyTavern remains the engine: it owns characters, chats, settings, prompt building, and generation. Pocket Tavern provides the phone-friendly interface. The Android host uses the same frontend, but APK releases are prepared from `main`, not from this branch.

## Working areas

Current documentation starts at [docs/README.md](docs/README.md). The ongoing [Layout v4 discussion](docs/LAYOUT.md) and parked [extension integration investigation](docs/EXTENSION_INTEGRATION.md) replace older design guidance.

- `prototype/frontend/` — interface and theme system
- `prototype/frontend/themes/` — built-in complete themes
- `prototype/extension/` — bridge to SillyTavern
- `phone-package/` — Termux preparation, launch, and update tools
- `scripts/` — package and development helpers
- `tests/` — automated checks

## Development loop

Run the checks:

```sh
npm test
```

Build the Termux package:

```sh
python3 scripts/build-phone-package.py
```

The ZIP is written to `dist/`. For an existing phone installation, copy that ZIP and `phone-package/repair-pocket.cjs` to Android Downloads, stop Pocket Tavern, and run:

```sh
node ~/storage/downloads/repair-pocket.cjs
```

Then open `http://127.0.0.1:8123/st-mobile/` on the phone.

## Branch flow

Develop and review features here. Once an iteration is ready for APK integration, merge it into `main` and build the release there.

Detailed architecture and safety notes are in [prototype/IMPLEMENTATION.md](prototype/IMPLEMENTATION.md). The Android convergence plan is in [docs/ANDROID_PRODUCT_ROADMAP.md](docs/ANDROID_PRODUCT_ROADMAP.md).
