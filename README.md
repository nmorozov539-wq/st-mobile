# STM development

This is the `dev` branch for STM, the technical identity for the next generation of this mobile SillyTavern interface. The public brand remains open. Version 0.9.2 is a transition-only handoff: the 0.9.1 application behavior is preserved. Runtime names and commands below still use the previous identity. Full STM code renaming and ST 1.19.1 qualification remain required implementation preflight before 0.10.

The new direction is an installable ST interface extension that also runs inside the Android APK, with optional platform capabilities. SillyTavern owns characters, chats, settings, prompt building, generation and extension loading. APK releases are prepared from `main`, not from this branch.

## Working areas

Start with the [0.9.2 handoff](docs/HANDOFF_0_9_2.md), [foundation roadmap](docs/FOUNDATION_ROADMAP.md) and [implementation preflight](docs/PREPARATION_0_9_2.md). The [documentation map](docs/README.md) separates current guidance from preserved design and implementation evidence.

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

The ZIP is written to `dist/`. For an existing phone installation, copy that ZIP and `phone-package/repair-stm.cjs` to Android Downloads, stop STM, and run:

```sh
node ~/storage/downloads/repair-stm.cjs
```

Then open `http://127.0.0.1:8123/st-mobile/` on the phone.

## Branch flow

Develop and review features here. Once an iteration is ready for APK integration, merge it into `main` and build the release there.

Architecture and Android integration follow the [foundation roadmap](docs/FOUNDATION_ROADMAP.md). Retained interface requirements are in the [design brief](docs/DESIGN_BRIEF.md); historical implementation notes are available through Git history.
