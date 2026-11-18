# Theme reference captures

These 390×844 images record the approved representative chat treatment for
Hearth and Light Paper as of 18 November 2026. They are review references, not
pixel-golden tests and not a freeze of navigation or screen layout.

- `hearth-chat.png`: dark charcoal/brass, portrait character accent, reading
  message presentation.
- `light-paper-chat.png`: warm light paper, fixed rust accent, card message
  presentation.

Font rasterization and subpixel placement may differ between Chromium,
Android WebView and host operating systems. Review hierarchy, contrast,
geometry, material, typography and character-accent behavior rather than raw
pixel identity.

To capture the deterministic fixture with the repository's normal external
Playwright installation:

```sh
POCKET_PLAYWRIGHT_MODULE=/path/to/playwright node scripts/capture-theme-references.cjs
```

The default output is `/tmp/pocket-theme-references`. After review, explicitly
replace the committed files with:

```sh
POCKET_PLAYWRIGHT_MODULE=/path/to/playwright node scripts/capture-theme-references.cjs --write
```

Ordinary tests never overwrite these references.

