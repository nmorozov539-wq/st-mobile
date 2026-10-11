Upstream: https://github.com/Lodactio/Extension-Summaryception
Pinned commit: 6a0afdc84fbd8f410db53738fa0f91d6a009eeb6
Version: 5.5.4, AGPL-3.0 (LICENSE and full modified source included).

Pocket integration adds a registered extension API, coordinates the complete
summary/repair pipeline with Pocket chat operations, and moves backlog choices
into Pocket's Memory panel. Summary algorithms and native storage are retained.
Native ST pages retain the original dialogs and UI. Auto-update is disabled so
an upstream change cannot silently remove this coordination patch.

0.7.9 additions to the registered Pocket API (all validated, all persisted and verified through window.pocketVerifyMemory): `read` also returns the assembled `injection` text and full advanced settings; `settings` accepts layer depth, hiding, logging, system prompt, wrapper (must contain {{summary}}), strip patterns, saved custom prompts and switching connectionSource back to default; `snippet` (edit/delete/regenerate, guarded by expected text), `clear` (also lifts the Pocket rebuild block), `import`, `export`, `repair` and `reset`. Native ST pages are unchanged.
