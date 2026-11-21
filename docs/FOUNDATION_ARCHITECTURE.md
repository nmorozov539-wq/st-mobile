# STM foundation architecture decisions

Updated 21 November 2026. Companion to the [roadmap](FOUNDATION_ROADMAP.md).

## Committed direction

STM is an ST interface extension with a shared browser/Android interface. Android features are optional capabilities advertised by the APK, not inferred from an Android user agent. Native capability presence does not itself authorize privileged operations; requests stay within the host's supported origin and capability policy.

ST remains authoritative for extension loading, data and generation. No author cooperation, privileged extension or maintained extension-specific fork is assumed. Preserve design intent and recovery safeguards. Technical identity is `stm`, fully transitioned before 0.10. ST baseline is 1.19.1. Group chats are excluded; slash commands and tools are included.

## Decisions to settle in milestone 1

| Question | Leading candidate | Required comparison |
|---|---|---|
| Composer ownership | Native ST textarea/form in STM framing | Direct extension writes, focus, selection, command/send and keyboard behavior |
| Chat ownership | Undecided | Native message DOM versus independent rendering through native formatting; actions, decorations, media, streaming and visual fidelity |
| UI isolation | Scoped STM styles, with shadow isolation where appropriate | Native descendants, event delegation, portals, theme inheritance and accessibility |
| Action exposure | Original complex controls, selective simple mirroring | Stable target/identity, redraw, busy/cancel, dropdown anchoring and activation requirements |
| Navigation ownership | STM navigation yields to active native surfaces | Native dialog dismissal, workspace history and Android Back do not double-handle an action |
| Saved-chat browsing | Explicit read-only view or deliberate activation | Never operate an extension on a different chat from the visible contextual target |

The extension distribution decision does not decide DOM ownership. A shared document simplifies access but does not remove asynchronous races or unsaved state. Do not bulk-port features before recording the chat/composer decision.

## Responsibility boundaries

The interface shell owns navigation, visual framing, themes and presentation. Native surface hosting owns visibility, lifetime, focus and dismissal. Styling owns palette/control appearance and can be disabled without disabling the surface. ST access owns target-aware operations and state observation. Android access owns optional platform requests and availability. Diagnostics owns structured reporting and recovery entrances. These are responsibilities, not a mandatory framework or microservice design.

Use native events and saves where available, but do not pretend they expose every independent extension request. Observe known state honestly, preserve operation targets and reconcile completions. No global network interception is assumed as a universal busy-state solution.

## Evidence required

The [source investigation](EXTENSION_ARCHITECTURE_RESEARCH.md) provides concrete trials: direct draft changes, message identity, cancellation tied to DOM identity, anchored popups, replaced settings roots and shadow workspaces. The [inventory](EXTENSION_COMPATIBILITY_INVENTORY.md) defines capability breadth. Both are source evidence, not runtime certification.

The existing patched Summaryception package is not an unmodified-extension test. Use pinned unmodified specimens and an independent holdout. Do not count native fallback as integrated presentation. If a generic mechanism fails, document the class of failure before considering a broader design change.
