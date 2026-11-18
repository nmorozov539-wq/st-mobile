# Extension integration — parked investigation

Updated: 18 November 2026. Status: notes for a dedicated future conversation; no implementation selected or authorized.

Extensions are essential to Pocket's direction. Keep them executing inside actual SillyTavern. The task is to expose their interfaces and coordinate their effects with Pocket, rather than recreate their runtime. Layout decisions remain in [LAYOUT.md](LAYOUT.md).

## Source investigation recorded so far

Inspected local `/home/Riv/SillyTavern`, package version 1.19.0, and Pocket's current bridge. These are source findings, not runtime compatibility results. Recheck against the engine revision used when implementation begins.

- `public/scripts/st-context.js`: `SillyTavern.getContext()` exposes native state and helpers for chats, characters, metadata, saving, generation, templates, popups, commands and other capabilities.
- `public/scripts/events.js`: lifecycle, message, generation, WI and settings events.
- Native mechanisms include slash-command, macro and function-tool registration, extension prompts and generation interceptors.
- `public/scripts/extensions.js` and `src/endpoints/extensions.js`: discovery, manifests/dependencies, loading, enable/disable and installation/update management.
- Settings containers include `#extensions_settings` and `#extensions_settings2`; `#extensionsMenu` holds extension actions. Templates return HTML. Extensions can attach handlers and manipulate native DOM directly. These conventions are not a universal declarative description of an extension UI.
- Official reference: https://docs.sillytavern.app/for-contributors/writing-extensions/

Pocket's `prototype/extension/adapter.js` dispatches extension actions through `window.pocketExtensions`, with explicit integrations and busy checks. It is not a generic mirror of all ST extensions. Existing Summaryception integration demonstrates an adapted interface, not general compatibility.

## Working understanding

- Summaryception/Memory must follow ordinary extension UI rules; it is no longer assumed to be a universally used built-in tool. Plan transition of its dedicated entrances/status surfaces under the general extension approach while preserving saved data, target coordination and recovery safeguards. Demotion of product placement is not authorization to remove those safeguards.
- A Pocket hub can provide containers and entrances for extension controls. Whether existing controls can be hosted while preserving their handlers, selectors, styles and popups is unverified.
- Copying native HTML into a different document does not guarantee working behavior. Preserving the original ST document context is a candidate to investigate.
- Extensions may also insert composer tools, message actions, inline displays or floating panels. A hub alone cannot address those interfaces.
- Extensions can operate directly in ST without passing through Pocket's bridge. Native changes may need observation and synchronization back into Pocket.
- Pocket's displayed chat can differ from ST's active chat, especially during generation. Contextual actions must coordinate target ownership and busy state; a visible button alone is insufficient.
- Bridge upgrades are a likely area of work, not a selected design. Generic discovery/exposure, native-state synchronization and coordinated contextual actions are candidate responsibilities.

## Deferred questions

### Concrete integration case: WIhero

Pocket's layout discussion selected WIhero as an optional, preinstalled, independently updated extension that can supply the WI workspace. Pocket retains its current base editor as an initial fallback when WIhero is disabled. Pocket does not depend on a normal-only package; the full extension is acceptable. Do not fork its editor into Pocket or assume Hero features must be stripped.

Use this as a stress test for workspace replacement and extension hosting, including routing the WI entrance, Back/close behavior, native context and mutation coordination, fallback, and update compatibility. The contract and implementation remain undecided. Android must allow extension updates without a later APK overwriting a newer installed copy; verify the storage/update lifecycle. Independent updates should not require a Pocket release unless the hosting contract changes.

### General investigation

1. What can we expose generically from ST's existing interface conventions?
2. Can native settings/menu/popup hosting preserve behavior without per-extension rewrites?
3. Which native mutations and lifecycle events must the bridge observe or reconcile?
4. How should actions coordinate active/displayed targets and ongoing engine work?
5. Where are explicit adapters or a small Pocket registration API necessary?
6. What compatibility claims can actual tests support?

The Extensions hub has a confirmed navigation slot, fourth or fifth in the default bar, with a placeholder until integration work begins. Its layout remains open. No general compatibility guarantee, universal UI mirroring, new bridge contract or general adaptation strategy has been approved. WIhero's optional role is settled, but its technical hosting approach is not. Continue with ST's infrastructure first when this investigation resumes, using WIhero as a concrete integration case when useful.
