# Pocket Tavern 0.6.2 interaction tweaks

Long-press increased from 550 ms to 1,000 ms. Cancel/lost-pointer-capture and a new press clear the old timer, preventing abandoned presses from opening a later menu. Auto-follow tolerance reduced from 80 to 1 CSS pixel for fractional scroll rounding. Existing regression coverage now checks that 30 and 2 pixels above the bottom do not follow, while the exact bottom and fractional rounding do. Android timing/comfort remains device feedback.

# Pocket Tavern 0.6.1 regression repair

The 0.6.0 native harness waited for an idle engine between operations and missed the actual first-click activation/send race. The real Pocket UI reproduced BUSY before a provider request, with Summaryception reporting a deferred no-op branch repair.

- 28 native ST/mock assertions pass, including activation → Send with no artificial wait, explicit regeneration with native looping overswipe, saved-alternative native state synchronization, and Send after deleting the last assistant reply.
- 94 automated tests pass. New coverage: no-op Memory repair releases ownership; explicit alternative generation retains old reply/reasoning; failure before text restores the old selection; partial alternatives are retained; a stale health failure cannot disconnect a replacement iframe.
- Pocket UI on real isolated ST 1.19.0/mock: first-attempt send and New reply succeeded, saved alternatives changed through an arrow and a horizontal drag at 390 × 844, and deleting the last assistant reply left the user message intact with the following Send starting normally.
- Shutdown/recovery UI check passed: killed the engine during a slow reply, restarted it, used Reconnect → Review saved work, then sent another message successfully. Only saved user history was loaded; the unsaved partial answer disappeared and no request was replayed.
- Existing alternatives update one native runtime message after a verified disk save, without a full CHAT_CHANGED/reload cycle. Earlier assistant messages with alternatives expose the same controls. Pointer capture retains a horizontal gesture when it leaves the original message element.
- Connection health is tied to the initiating iframe port; delayed failures from a replaced iframe are ignored. A longer bridge deadline accommodates native work while the independent HTTP engine check still detects shutdown.

# Pocket Tavern 0.6.0 validation

- 87 automated regression/foundation tests pass, including scope precedence, full-copy independence, conflict guards, batch deletion, fork Memory validity, no-op alternative selection, pending-field coalescing, bounded render windows and invalid-memory injection/API suppression, deferred Memory ownership and protection against running on a different chat.
- 22 real isolated ST 1.19.0 browser integration assertions pass: independent chat reads; character scope persistence, sampler independence, Reset and disabled-copy retention; chat scope/settings; preset/model separation; original-preserving forks and deterministic destination-collision protection; message deletion and Memory invalidation; Undo restoring memory/history; stale-edit rejection; reads during generation; engine activation lock; early Stop with native save/readback; chat deletion and chat Undo.
- Prior v0.5.* phone/provider confirmations remain evidence for the underlying engine and optional proxy, not proof of the new Android UX. No real keys, personal data or paid model requests were used in these checks.
- 11 sanitized HTML browser checks pass. The actual ZIP/update flow also passes, including duplicate download names, required modules, backups and preservation of existing settings/local extension data.
- Manual UI checks: browsing a different chat during a slow reply, an independent unsent draft, two queued sampler fields saved to that other chat, original generation target retained, and a visible disabled/offline state after engine shutdown.
- Reasoning checked live: initial Thinking closed, previous reply opened, next reply and its saved result inherited the expanded state.
- New UI checked at a 390 × 844 browser viewport; phone gesture/keyboard/background/performance comfort remains a user/device test.

The release uses the root v0.6.0 ZIP and matching repair script. Detailed behavior and deliberate limitations: [implementation notes](../prototype/IMPLEMENTATION.md). Historical reports are archived locally in `history/TEST_REPORT-full.md` and remain recoverable from Git history.
