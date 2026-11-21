# STM theme contract

Status: `ui-theme` version 2, introduced during Milestone 2.

STM themes are validated data manifests. They can change atmosphere and
presentation, but they cannot supply CSS, scripts, fonts, SVG paths, layout,
navigation, visibility rules or hit-target sizes.

## Compatibility contract

- `ui-theme` version 2 is the current complete manifest.
- Complete `ui-theme` version 1 manifests upgrade to version 2 with the exact
  Hearth typography, Lucide treatment and portrait-accent defaults.
- Legacy `ui-color-theme` version 1 manifests upgrade with all Hearth visual
  defaults.
- Unknown future versions are rejected. A rejected or corrupt stored theme is
  ignored and the first built-in theme is applied.
- Exported themes are normalized version 2 manifests. Unknown manifest fields
  are not retained.
- The storage record has its own version. A theme-version change does not by
  itself require a storage-container version change.

Adding an optional installed font or icon pack does not change this schema.
Adding required fields, changing field meaning, or allowing a new capability
requires an explicit manifest-version decision and upgrader.

## Manifest

The built-in manifests in `prototype/frontend/themes/` are canonical examples.
Every field below is required after migration.

### Identity

- `kind`: exactly `ui-theme`.
- `version`: exactly `2`.
- `id`: lowercase letters and numbers separated by `.`, `_` or `-`.
- `name`: a non-empty display name.
- `scheme`: `dark` or `light`.
- `source`: optional descriptive `type` and `name`; never executable.

### Colors

Required semantic roles:

- surfaces: `canvas`, `surface`, `raised`;
- text: `text`, `mutedText`, `faintText`, `dialogueText`, `narrationText`;
- interaction: `accent`, `onAccent`, `link`, `focus`;
- feedback: `success`, `warning`, `danger`;
- messages: `userMessage`, `assistantMessage`;
- material: `border`, `shadow`, `scrim`;
- character fallback: `characterFallback`.

Essential colors must be opaque. Message, border, shadow and scrim roles may
carry alpha. Validation checks the text/surface, rendered message, focus,
status, accent and character-fallback combinations used by the interface.

### Shape and effects

`shape` contains bounded radii for small, medium, large, avatar and message
surfaces plus a 0–2px border width. `effects` contains bounded chrome opacity,
blur, shadow strength, background glow and character glow.

These fields cannot change component dimensions or minimum hit areas.

### Presentation and motion

- `presentation.density`: `compact`, `comfortable` or `spacious`;
- `presentation.messages`: `reading`, `bubbles` or `cards`;
- `motion.scale`: 0–2.

Density scales spacing tokens only. Reduced-motion media preferences override
all theme-controlled motion durations to zero.

### Typography

```json
{
  "uiFamily": "rubik",
  "readingFamily": "literata",
  "uiScale": 1,
  "readingScale": 1,
  "uiWeight": 400,
  "readingWeight": 400,
  "readingLineHeight": 1.62
}
```

Family values are installed aliases: `rubik`, `literata`, `system` and
`serif`. They are not CSS stacks or URLs. Scale is limited to 0.9–1.2,
weights to installed 400/500/600 faces, and reading line height to 1.4–2.

The device-local Appearance text-size and spacing choices remain user
preferences. Theme reading scale and line height form a bounded baseline;
they do not remove or reduce the user's large-text choice.

### Icons

```json
{"pack":"lucide","strokeWidth":1.75,"fill":"none"}
```

Version 2 accepts the registered `lucide` semantic pack, stroke widths from
1.5–2.25 and its supported `none` fill treatment. A pack is code registered
against semantic names such as `home`, `send` and `settings`; manifests cannot
provide SVG, path data or URLs.

### Character accent

`characterAccent.mode` is one of:

- `portrait`: an explicit card color, otherwise portrait extraction, otherwise
  `characterFallback`;
- `fixed`: always `characterFallback`;
- `disabled`: suppress character-specific color and glow, using the normal
  theme accent where emphasis is still required.

The chosen color is repaired against the active canvas and its on-accent ink
is calculated from the actual resolved color. Portrait extraction is cached
before theme-dependent repair, so switching between light and dark themes is
safe.

## Public and internal CSS variables

Manifest-backed variables are stable implementation hooks for Pocket's own
component CSS. They are not a promise that arbitrary external CSS is supported.

- Public semantic variables begin `--color-`, `--shape-`, `--effect-`,
  `--font-`, `--type-`, `--weight-`, `--icon-`, `--density-` or `--motion-`.
- Calculated variables include stronger borders, selected/hover colors,
  warning/danger surfaces, shadows, glow percentages, the reading-line ratio,
  character ink and spacing tokens.
- Calculated values may change formula within a compatible schema version when
  their semantic result remains the same. Theme authors should set manifest
  fields rather than depend on calculated formulas.

## SillyTavern import

The converter reads its allowlisted color fields only. It ignores custom CSS,
layout widths, avatar visibility and other behavior. Alpha colors are
composited where an opaque role is required, unsafe text colors are repaired,
and all Pocket-only v2 fields inherit from the selected safe base theme.

## Deferred product UI

The engine and store support selection, staged preview, cancellation, import,
export, removal and reset. Their product UI and a user-facing recovery route
are deliberately deferred to the broader post-contract UI pass. Until then,
the application loads the persisted selection and falls back safely, but these
operations are not presented in Settings.
