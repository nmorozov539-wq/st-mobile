# Mobile layout correction implementation plan

Date: 20 November 2026. Baseline: `dev` at `d8d68d3`. Implementation is authorized for the third coding chat. This pass follows the user's first real-phone feedback; previous browser candidate acceptance does not override these observed failures.

## Goal and scope

Make Layout v4 work coherently on the phone: repair folded WI/navigation and Messenger, remove obsolete preset entrances, simplify chat chrome, integrate native configuration controls into Pocket styling, improve collection browsing, correct character color editing, consolidate notifications and reduce Home's unnecessary height. Deliver tested vertical slices and a phone retest checklist keyed to the reported issues.

Include simple character folders after filters, plus investigation and bounded improvement of the 30 MiB import limit. Prioritize Hearth and Nocturne Portrait. Keep Paper and Monolith usable but do not redesign their theme identities. Background patterns/images, animation, general extension hosting, WIhero, Kotlin work and new gestures are deferred. Preserve the existing updater, diagnostics, native configuration ownership, legacy-data preservation and operation safeguards.

Do not publish, push, merge or commit implementation without a new instruction. The supervisor is chat `01a1f086-9565-7172-9541-bc8279bf32c2`, host `local`. Report evidence and unresolved decisions there. Routine mechanics and decisions specified below need no repeated user approval.

## 1. Reproduce the actual failures first

Run the current baseline tests and a disposable installed-package fixture. Record source/build/installed revision and browser asset URLs. Prior builds reused `0.9.0` asset query values: investigate stale browser assets as a possible contributor, but do not dismiss phone reports as caching without evidence.

Reproduce each report through real UI actions, including reload and returning from another screen. Tests must assert computed layout/visible functionality and routing, not only saved preferences, selector existence or strings in source. Build a test fixture with existing legacy scopes, a separately migrated native install, multiple lorebooks, many tags, multiple character conversations, automatic/fixed character colors and an oversized import.

For this correction candidate use matched frontend/bridge release `0.9.1`, updating the package name, manifest, cache query strings and mismatch tests consistently. Source commit provenance remains independently recorded. Demonstrate that installing over 0.9.0 and reloading selects new assets without asking users to clear storage or delete drafts.

## 2. Folded WI and navigation

Distribute bottom navigation equally across the visible destinations: five by default, four when WI is folded. Use a dynamic visible-count grid or equivalent flexible layout; hidden items occupy no track. Preserve ordering and restore WI at its saved rank on unfold. Test both layouts at 320/390 px and with reordered destinations.

Fix WI's visibility predicate: `world-info.js` currently refuses rendering unless `onPage('wi')`, which excludes Library's WI section. Provide an explicit workspace-visible predicate and entry origin, not a scattered collection of special-case page names. Folding changes the entrance only: books, folders, import/create, activation controls, search, entries, loading/retry and dirty-state guards must all remain available.

WI entry and activation Back/Cancel return to their captured origin (Library/WI or standalone WI), preserving selected tab and appropriate list position. Load completion must not replace a different Library tab; use existing session/target guards. Toggling fold while on WI must navigate to its corresponding valid location without losing a draft or duplicating the workspace.

Exit evidence: populated folded WI and its editor round-trip; empty/loading/failure states; no blank workspace; four visible buttons filling the bar.

## 3. Messenger must visibly work

Trace preference normalization, the root `data-message-format` attribute, CSS cascade, theme application and the actual rendered message DOM. Keep one message controller in compact and tablet layouts. Prefer scoped component selectors or an explicit cascade structure over accumulating `!important` overrides.

Reading: shared comfortable reading column, restrained containers. Messenger: content-sized bubbles, distinct incoming/outgoing alignment, bounded widths, spacing and coherent name/avatar treatment. Keep controls, composer, message actions, thinking, streaming and alternatives identical. Applying a theme must not reset message format. Text size and spacing overrides retain precedence.

Switch via Settings, return to an existing chat, reload, change theme, switch back. Compare computed bubble geometry/alignment and captures of the same transcript. Cover short replies, long prose, code/table overflow, streaming, thinking, inline edit and saved alternatives. Preserve scroll anchoring and draft content during switches. Test Hearth and Nocturne in both formats; smoke-test the other themes.

## 4. Chat tools and native configuration

### Chat chrome

Use Back, character identity and one overflow menu in the header. Remove separate clickable persona and preset chips; persona/preset selection remains in the overflow menu. An unobtrusive noninteractive subtitle is acceptable only if it fits without competing with the character name. Move the model selector back into the composer area with Send/Stop; do not reduce textarea usability or add a new scope selector. Retain existing persona picker behavior and Memory's temporary explicit access and safeguards.

### One native configuration path

All Home/Settings/chat preset entrances must use the same native-owned configuration tool. Remove ordinary entrances to Pocket's scoped editor and global/character/chat selectors. Preserve the old records and recovery/export functions. If an installation has not completed preservation, route to a dedicated migration-required explanation and workflow; never silently discard data or use an old scope editor as the default substitute.

Home Connection and Presets rows open the full tool immediately, with no intermediary page/button. General Settings index still opens normally; selecting a topic opens its tool directly. Back returns to the origin, closing nested native layers first. Do not auto-activate a chat merely to browse global settings.

### Native controls in Pocket presentation

The user's new acceptance requirement supersedes the previous full-native-window fallback as the final product surface. Keep ST's original controls, handlers, preset managers and persistence, but style the hosted tools as Pocket pages. Do not clone forms or restore Pocket-owned configuration copies.

Work inside the existing engine iframe/document. Scope a Pocket native-settings stylesheet and semantic CSS variables to the managed host session. Adapt typography, surfaces, borders, spacing, widths, disclosure headers, inputs, selects, buttons and native popup layers. Sync theme and text-size/reduced-motion preferences when the host opens and changes; restore temporary styles/state on close. Set iframe bounds to the topic content region, with Pocket's header/Back outside it; no raw ST top-navigation strip or unrelated drawer controls.

Use real native grouping and disclosure where possible. The old Pocket preset editor supplies interaction references, not competing save logic. Cover native Chat Completion preset/prompt editing and Text Completion sampler/context/instruct tools. Never hide capability solely because a control is awkward to style. Maintain the existing exclusive engine session through pending native saves and verified close, focus/keyboard safety and nested popup handling.

Report an early executable integration checkpoint with Connection, CC Presets/prompt editor and TC formatting captures in both priority themes. If a native subtree cannot safely be adapted, report the exact limitation and a bounded alternative to the supervisor before declaring this slice complete. Do not silently revert to the previously rejected raw-window experience.

## 5. Collection controls and character folders

### Chats

Replace the persistent Recent/By character segmented row with a compact filter/view button opening a sheet. Initially include only grouping (Recent or By character) and any already functioning sort behavior; no fake future filters. Keep search accessible. In By character mode all groups begin collapsed on entry, including search results; show matching counts and let the user expand explicitly. Preserve expansion while interacting within that visit. Verify deletion/Undo, selection and tablet shared-chat behavior remain intact.

### Tags and Library filtering

Replace the continuous tag strip with a Filter button and a compact summary of active filters (count plus Clear, with full choices in the sheet). The sheet has searchable tags, multi-selection and Clear/Apply/Cancel. Choose AND semantics initially and label it “Match all selected tags”; do not add a mode selector yet. Combine tag, text and folder filters deterministically. Preserve the draft selection until Apply; Cancel makes no changes. Distinguish no matching results from an empty library, with a clear reset route. Do not use theme colors alone to indicate selection.

Use an import-into-library icon and the visible/accessible label Import. Verify character import and lorebook import icon meanings are consistent; exports remain clearly separate.

### Simple virtual folders

Add one level of character folders: All characters, Unfiled and user-created folders. A character has zero or one folder; tags remain many-to-many and independent. Use a compact folder selector and explicit Create/Rename/Delete folder and Move character actions. No nested folders, filesystem moves or native identity changes in this pass.

Store a versioned namespaced organizational record in ST user settings, separate from character cards and native configuration migration. Folder IDs are stable opaque IDs, assignments use native character keys, and writes preserve unknown/unrelated settings with revision guards and saved readback. Keep browser-local active filters separate. Deleting a folder moves assignments to Unfiled and never deletes characters/chats. Imported/new/duplicated characters start Unfiled; native character deletion removes or harmlessly prunes stale assignments. Exporting a card does not leak private folder metadata.

Capture target identity for moves; delayed writes cannot move a newly selected card. Handle concurrent native settings changes and unavailable engine state visibly without discarding the user's filter state. Test folder persistence after reload, rename/delete, filtered-out selection and many-tag/many-character lists. Deliver this after basic browsing fixes; it must not delay review of the core defects.

## 6. Character color and import size

Replace the misleading gold fallback in `character-editor.js` with an explicit Automatic / Custom mode. Automatic shows the resolved portrait/theme-aware preview with a label and stores no override. Custom starts from the resolved color when available, then saves only on the existing explicit card Save. Cancel preserves the original mode and value. Reset to Automatic clears only the Pocket color override. Test no portrait, automatic accent disabled by theme, existing fixed override and entering/leaving Edit without changes.

The existing 30 MiB character limit is Pocket-enforced in `asset-store.js`. Add preflight file type/size validation at the import picker before expensive decoding or sending, retaining bridge-side enforcement. Show actual size and limit using consistent units. An oversized card must produce one local error and no network/mutation attempt.

Audit the pinned ST upload path and transport memory costs before changing the cap. Initial target is support for cards up to 64 MiB if the native route allows it and bounded-memory validation demonstrates the path does not multiply the entire payload unnecessarily. If that target is not supportable, retain the measured safe limit with clear copy and report the blocker; do not claim 64 MiB support from removing one check. Test just-under/over boundaries, malformed PNG/JSON, decode failure and cancellation, and a generated >30 MiB valid card in a disposable fixture. Avoid paid requests. Real-phone memory behavior remains explicitly unverified until user retest.

## 7. One visible notification owner

Keep the structured error record and bounded Diagnostics history, but assign each failure one active presentation owner: import validation to import UI, editor save to the editor, generation to its composer, engine-wide failures to recovery. The record's diagnostic history is not a second popup.

Propagate an operation/event identity across bridge errors, native notice wrappers, `action()` handling and local catches. A handled operation error must not also trigger a global toast/banner. Clear or hide page-owned presentation when its originating view is no longer visible; preserve it only in a genuinely unresolved operation/editor session. Returning to that session may show the same error once, not create another event. Successful retry/dismissal resolves visible state while keeping history. Do not suppress distinct simultaneous failures or another chat's saved-state warning through overbroad time-window deduplication.

Reproduce the exact oversized import -> navigate Home -> return Library -> retry journey. Assert one visible explanation in its owner, one history record and no persistent unrelated banner. Also test server rejection, native toast plus structured error, unknown save outcome, two different operations and engine loss while an import is open. Provider details remain escaped/redacted, drafts and uncertain-operation review remain intact.

## 8. Home density

Reduce lower-half padding, oversized empty/Continue cards and duplicated Start new chat emphasis. Use a compact connection/preset group, one Continue action when a valid chat exists, up to three recent rows and one clear Start new chat action. Empty Home has one primary choose-character/start action, not two equal invitations.

At 390×844 with default Hearth/Nocturne reading settings and the standard short recent list, content should fit without incidental vertical scrolling. Diagnose actual overflow and safe-area/chrome costs rather than applying overflow:hidden. Smaller viewports, large text, expanded errors and long labels may scroll naturally; no clipped actions or minimum-height tricks. Test 320 px, 390 px, 200% UI text, keyboard return and light/stress theme smoke checks. Preserve deliberate tablet composition.

## 9. Delivery and evidence

Execute in this order, styling and validating each slice as it lands:

1. Baseline reproduction, build/cache identity, folded WI/nav and Messenger corrections.
2. Chat chrome and removal of legacy preset entrances; preserve migration routing.
3. Direct native Connection/Presets with Pocket styling, early supervisor checkpoint before broader cleanup.
4. Notification ownership, color mode and import preflight/size investigation.
5. Chats grouping sheet and Library tag filters, then simple virtual folders.
6. Home density and installed-package regression across the changes.

Create `docs/MOBILE_CORRECTION_IMPLEMENTATION_REPORT.md`, deterministic live journeys under tests, and `docs/mobile-correction-evidence/` with original failure descriptions, reproductions, before/after captures, assertions, exact commands and limitations. Reuse existing disposable ST/mock harnesses; never test mutations against personal data. Do not overwrite earlier milestone evidence to disguise regressions.

Acceptance matrix must map every user report to an observable result. Include direct native tool opening from Home and chat, nested Back, all message-format/theme combinations for priority themes, folded WI editor origins, four-item navigation widths, initially collapsed groups, many tags/folders, automatic color, one-error presentation, oversized import and no incidental default Home scroll. Verify behavior after source update from d8d68d3 using the real Git updater and after reload; run the full suite plus package install/mock conversation/matched-build checks. Test both fresh and migration-pending installations.

Static selector/source-string assertions cannot establish these user-facing outcomes. Show computed geometry, route/call counts, absence of duplicate alerts, actual saved state and screenshots of the same content before/after. Keep shared tablet chat/controller, engine locking, updater recovery and diagnostics regression coverage. Do not label desktop emulation as phone or WebView qualification.

Submit each major checkpoint and the final candidate to the supervisor. Ask about evidence-driven deviations, especially native-host integration and larger imports; continue independent work while awaiting decisions. The user will retest on the phone after the candidate is reviewed and explicitly committed/pushed. Patterns/background images and broader theme redesign remain a later discussion.
