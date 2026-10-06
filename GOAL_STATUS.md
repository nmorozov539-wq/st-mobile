# Pocket Tavern implementation checkpoint — v0.5.0

The current implementation goal is completed for the PC-testable prototype.
Phone validation of the new features remains explicitly documented, rather than
being inferred from mock checks. The user confirmed real streamed OpenRouter
responses inside the prior v0.4.5 Pocket Tavern on Android with the optional proxy.

| Requirement | Evidence | Status |
| --- | --- | --- |
| One combined engine/frontend launch, optional proxy | Native combined fixture, shutdown/busy-port and proxy integration checks; user phone response | Implemented and verified |
| Standard ST data ownership | Native ST APIs plus independent file/settings readback; non-merging importer fixtures | Verified with isolated data |
| Tiny connection test | Visible reply; mock saw one-message nonstream request, 16 output tokens; normal budget restored | PC verified |
| Character import/create/edit | Native JSON/PNG card routes, fields/portraits/advanced JSON; live creation/edit/import, unknown metadata retained | PC verified |
| Persona import/create/edit | Native avatar/settings routes; live creation and backup import, foreign fields retained | PC verified |
| Preset import/create/edit | Native preset routes; manual prompt text, order toggles, arbitrary fields, active selection and saved temperature readback | PC verified |
| Summaryception Default ST connection | Pinned adapted upstream source; live layers/ghosting/reload/injection/stop and atomic operation lock tests | PC verified |
| Existing streaming/stop/edit/swipes/reasoning/history | Regression suite plus prior browser and phone evidence | Retained |
| Working preview and transfer archive | localhost:8123/st-mobile; root v0.5.0 ZIP, updater and instructions | Ready |
| Personal data migration | Standard folder copy tool refuses merges/overwrites, source retained; documented fresh-folder workflow | Tool ready; no personal migration performed |

68 automated tests pass, plus proxy and archive/update integration checks.
TEST_REPORT.md records live checks and limits. The phone instructions explain
updating the current installation without replacing its data and a separate
fresh-folder migration workflow.

General SillyTavern extension support remains a later requirement. The new
extension registry provides a common read/control route, while the full ST
runtime still owns loading/events/settings. Summaryception is the first adapted
extension, not proof that arbitrary DOM-dependent extensions work. Its pinned
5.5.4 source and license are included; automatic updating is disabled to preserve
the coordination patch. Current Pocket memory uses its Default ST connection
and single-character chats. Other connection modes and advanced memory editors
still require full ST; their saved configuration is preserved.
