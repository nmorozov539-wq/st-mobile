# Git updates, error reporting and engine diagnostics

Date: 19 November 2026. Coding handoff, implementation authorized by the user's request for a second coding chat. Baseline: `b56ca02`, the Milestone 3 browser/Termux release candidate. This follow-up does not claim real-device qualification or replace the remaining Milestone 3 phone/WebView checks.

## Outcome and boundaries

Make repeated phone testing possible without downloading ZIPs; make failed operations understandable and recoverable; expose the actual SillyTavern terminal output even after the engine exits. Implement through the existing Node launcher and vanilla web frontend, preserving one ST engine and its data ownership.

Scope includes Git-based Pocket code installation, transactional update recovery, structured errors, bounded native notification forwarding, launcher-owned logs and a read-only diagnostics surface. General extension hosting, WIhero, shell execution from the browser, remote administration, automatic engine upgrades and Android/Kotlin implementation are excluded. Retain existing ZIP install support. No push, release publication or deployment is authorized by this plan.

## 1. Current source and responsibilities

- `phone-package/update-test.cjs` backs up selected code and overlays a prepared kit. It is not a Git updater or a complete crash-safe transaction: partial copy failure and stale removed files need explicit handling.
- `scripts/build-phone-package.py` defines the shipped asset set. Source updates must use the same definition rather than a competing handwritten list.
- `phone-package/start.cjs` owns ST/proxy child processes, forwards stdout and inherits stderr. It currently does not retain both streams in bounded log files or continue serving diagnostics after an engine exit.
- `prototype/extension/runtime.js`, `adapter.js` and `frontend/error-message.js` supply existing generation/error handling. Extend them; retain operation identity, saved-state verification, target binding and no automatic resend.
- Android already has rotating runtime logs, but the follow-up implements the browser/Termux host only. Define a portable diagnostics presentation contract without changing Kotlin.

## 2. Git update design

### User workflow

Add a repository-side command `node phone-package/update-from-git.cjs --target <installation>` with optional `--ref <branch/tag/commit>` and `--rollback`. Document a one-time clone using the user's existing Git credentials, then this one command for subsequent updates. A shell alias may make it shorter. Do not ask users to copy archives, overwrite their installed data, or paste credentials into Pocket.

Default source is the command's repository origin and `dev`, matching this development track. Make this explicit in the first configuration; persist source URL without credentials and chosen ref in installation metadata. Use the user's normal Git authentication; do not collect, log, rewrite or embed credentials. Support SSH/HTTPS remotes and useful authentication/network error messages. Do not push or change remotes automatically.

Maintain a separate managed source checkout/cache, never put the live ST installation or its data under Git. Fetch the selected ref, resolve an exact commit and stage an immutable detached checkout. Refuse to discard edits in a user-managed checkout. Execute Git with argument arrays and validate refs; do not build shell strings or execute repository hook commands for updates. Record old/new exact commits, build versions, ST compatibility and outcome.

Extract a shared package-staging helper used by both ZIP builds and the Git updater. Produce an unpacked kit directly from the selected source revision; avoid making Python or unzip a new prerequisite for routine phone updates where Node can stage assets. Preserve the package manifest, bundled patches and notices. Pin ST 1.19.0 and existing engine inputs; a Pocket source update must not pull an arbitrary new ST revision or run broad dependency upgrades.

### Transaction and recovery

Require a stopped installation. Use an installation update lock plus launcher ownership metadata and port checks; a port being free alone does not establish that the target is stopped. Refuse overlapping launcher/update/rollback operations. The launcher must refuse startup while an interrupted update needs reconciliation.

Sequence: fetch -> resolve commit -> stage complete kit -> validate manifest, compatible engine and matched frontend/bridge -> record transaction -> back up managed code -> replace only managed paths -> verify installed hashes -> commit installed manifest -> release lock. Keep data, credentials, chats, themes, personal extensions and unrecognized files untouched. Handle known user-local Pocket code overlays consistently with the existing updater; never overwrite arbitrary third-party extension code.

Use a durable transaction journal and per-path replacement/backup tracking. Do not call the whole operation atomic if it spans multiple file renames. On interruption, next launch/update detects the journal and restores the prior managed code or finishes only a fully verified staged installation. Removed managed files must disappear instead of surviving recursive overlays. Keep at least the previous two successful code backups, with bounded pruning that never deletes the active transaction or user data.

Rollback restores a matched code set and manifest, not user data. Store compatibility metadata and refuse automatic rollback across a data-schema boundary the older code cannot read; explain backup/recovery needs. Do not infer that retained files make every downgrade safe. First implementation supports the same native-ownership schema as baseline 0.9.0.

An unchanged exact revision is a no-op. Fetch/staging failure leaves the running version untouched. Installation verification failure restores old code or marks recovery required. Print installed commit, target folder and the existing launch command after success. Keep ST stopped until the user explicitly starts it.

## 3. Structured error and notification contract

### Error record

Introduce one serializable error shape with bounded values:

```js
{
  id, timestamp, source, severity, category,
  operationId, target, sessionId,
  summary, detail, providerCode, httpStatus,
  outcome, actions
}
```

Sources distinguish Pocket, ST, provider, launcher and updater. Target/operation fields may be absent for general notices; never attach another chat's notification to the visible chat. `outcome` distinguishes not submitted, failed, partial saved, completed, and uncertain. Actions are an allowlisted UI vocabulary (open connection, view saved conversation, inspect details, open logs, retry explicitly), never executable instructions from a provider.

Normalize provider errors using structured codes/body where available. Cover authentication/permission, insufficient credit/quota, rate limiting, missing model, context limit, provider overload/failure, network/DNS/TLS failure, timeout, interrupted stream, engine unavailable, save/verification failure and unknown errors. HTTP 429 does not prove insufficient balance; HTTP 402 alone may justify payment-required wording, not an invented account balance. Preserve bounded sanitized detail when classification is uncertain.

Generation errors remain persistent near the composer with one readable summary, expandable details and appropriate action. Keep recovery notices above irrelevant status text, prevent stacked duplicates, and preserve drafts. A partial response remains inspectable; an uncertain saved result requires inspection before retry. Never automatically repeat a paid operation. Stop is a user action, not a failure notification. Retain the existing engine/API/unchecked distinctions on Home.

Provide a bounded recent-event list under About -> Diagnostics (initial limit 100 normalized records). Avoid a permanent chat notification center or new navigation destination. Runtime update errors are printed and retained in diagnostics; editor/import/migration/WI errors use the same presentation semantics without replacing their existing draft/conflict recovery.

### Native ST notices

Inspect the pinned native event/error mechanisms first. Capture operation-aware errors at their real dispatch/generation boundaries. For notices only emitted via native toast calls, implement a small reversible wrapper around the pinned notification API that calls the original function unchanged and emits a sanitized, bounded bridge event. Do not scrape toast HTML as the sole error source or globally monkey-patch fetch to infer every operation.

Document which native notification paths are covered. General native notices must stay general unless an operation correlation is proven. Avoid double reporting when a structured operation error and a toast describe the same failure; deduplicate by session/operation/category and a short time window. Preserve notices inside an actively hosted native page without duplicating them across two visible surfaces. Handle reconnect subscriptions and wrapper teardown without accumulating listeners.

Render provider text as text, not HTML. Bound error/body sizes and strip credential headers and known secret fields. Do not include full prompts, messages or request bodies in normalized records by default. Unknown providers get a safe generic explanation plus available details, not false certainty. Test coverage must enumerate categories; do not label the result “full coverage of all providers.”

## 4. Launcher-owned logging and diagnostics

### Collection and lifetime

Extend the existing launcher into a lightweight supervisor that owns the child processes and an independent diagnostics HTTP service. Do not add another ST process. Bind diagnostics to loopback only, default port 8125, with explicit configurable fallback and a clear bind-failure message. ST retains 8123 and the existing proxy/mock ports.

Capture both stdout and stderr from ST/proxy, tee to the terminal and write timestamped source-tagged records into private installation-local logs. Distinguish unstructured terminal output from normalized product errors. Strip ANSI for the viewer; render all text inertly. Handle split UTF-8 chunks, huge lines, binary/control data and output bursts without unbounded memory or blocking generation. Use a byte cap per line and a ring buffer; keep two 1 MiB log files by default. Test rotation rather than relying on configuration alone.

On unexpected ST exit, retain last output/exit metadata and keep diagnostics alive. The UI says “Engine stopped”; no automatic restart/resend. Ctrl+C intentionally shuts down all children and diagnostics. A later normal launch can read the prior bounded log. If the supervisor itself is killed, its service cannot remain reachable: state this honestly, and retain the private files for the next launch. Allow `node start.cjs --diagnostics-only` to inspect prior logs without starting ST.

### Access boundary

Diagnostics must not expose logs to arbitrary browser pages merely because it is on localhost. Use a cryptographically random bootstrap capability shown only in the launcher's local console as a URL fragment. The diagnostics page exchanges it via same-origin POST for a narrowly named HttpOnly, SameSite=Strict session cookie; erase the fragment immediately. Protect log/status/export endpoints with this session, exact Host/Origin validation, no permissive CORS, no cross-origin mutations and no arbitrary filesystem-path endpoint. Bind 127.0.0.1 only. Do not persist a bearer token in the public frontend assets, source repository, errors or log output.

Pocket's About -> Diagnostics shows normalized in-app events and an “Open engine log” action to the independent viewer. Existing authenticated sessions open directly. First use gives a simple instruction to use the launcher's private link; do not repeatedly demand authentication during the same launcher session. In a crash, the user can keep/open that standalone viewer without relying on ST or its iframe. Explain this split in user-facing copy concisely; no implementation jargon in the normal error flow.

Use cursor-based incremental reads (1-second polling while live, pause when hidden) to avoid making SSE/WebSocket infrastructure a requirement. Return bounded batches, cursor, session ID and rotation/truncation indicators. Preserve scroll while reading older lines; offer Follow latest, Pause, source/severity/text filters, Copy selected and Export recent. Show last known engine state separately from viewer connectivity. No terminal input, command runner, interactive shell or restart control in this pass.

### Privacy and export

Terminal output may contain private prompts even when credentials are absent. Keep logs local/private and never upload automatically. Redact known credentials/header forms before writing; do not promise regex filtering catches arbitrary secrets. Disable verbose request-body capture by default where supported without breaking ST diagnostics. User explicitly initiates export, sees the exact redacted preview and a short reminder that conversation text may remain. Export includes bounded logs plus build/commit/ST/runtime and operation IDs, never configuration dumps or automatic chat attachments.

The launcher service is the independent log source; the Pocket bridge forwards native UI notices, not arbitrary file reads. Future Kotlin integration can implement the same read/status presentation contract from its existing bounded files. No Kotlin changes now.

## 5. Delivery slices and tests

1. **Baseline and shared staging:** record current test failure, package set, launcher behavior and source revision. Extract shared staging with parity tests against the existing ZIP contents. Preserve frontend/bridge version matching and licensing.
2. **Git updater:** local temporary Git remote with two revisions; update, no-op, rollback, removed-file cleanup and credential-free status. Inject failure/termination at every install checkpoint. Verify user-data hashes unchanged and startup refuses an unresolved transaction. Test offline/auth errors, dirty checkout, busy target and unsupported ST/schema.
3. **Error contract/native notices:** deterministic CC/TC mock cases for each supported category, native toast-only failure, duplicate toast+operation error, uncoupled notices, partial save, uncertain save and engine loss. Validate origin/target/session attribution, draft retention, no silent retries and sanitized rendering. Extend existing error tests rather than bypassing adapter verification.
4. **Log supervisor:** stdout/stderr tee, source labels, Unicode chunks, 10 MiB burst, rotation, restart history, diagnostics-only and ST crash while viewer remains responsive. Verify normal shutdown leaves no server/child behind.
5. **Diagnostics UI/security:** 390 px/320 px/tablet, large text, all theme families where Pocket UI applies, long lines and keyboard navigation. Unauthorized log/export calls, hostile Origin/Host, HTML log strings, expired session and rotation cursors must behave correctly. Standalone viewer uses a fixed readable light/dark palette with no dependency on engine theme availability.
6. **Integrated qualification:** install baseline in a disposable fixture, update from a local Git remote through the new command, launch, generate and induce provider errors, inspect actual logs, kill only ST and continue viewing logs, export a redacted bundle, rollback compatible code and recheck preserved data. Rebuild ZIP and repeat installed-package behavior. Record exact commands, source commits, screenshots and machine-readable assertions in a follow-up report.

Run relevant unit and live suites plus the complete existing suite at the final checkpoint. The baseline repair-test stderr failure must remain explicitly classified, not hidden or used to excuse new failures. Repair/updater changes may make resolving that harness debt appropriate: investigate deterministically and distinguish subprocess timing/harness behavior from production failure reporting.

## 6. Acceptance and supervision

Deliver source, tests, reproducible scripts, phone setup/update commands, diagnostics entry/access instructions, support matrix and an implementation report. Git update must work without downloading an archive after initial clone, preserve data, pin the engine, install matched assets and recover safely from interrupted writes. User-visible errors must be actionable and faithful to provider evidence. Actual terminal stdout/stderr must be available after child-engine failure through the launcher-owned viewer.

No APK readiness or real-phone qualification claim without corresponding evidence. No silent extension scope expansion. Build the follow-up as a separately reviewable change after baseline `b56ca02`.

Report to supervising chat `01a1f086-9565-7172-9541-bc8279bf32c2` on host `local` after baseline, each major gate and final candidate. The human has authorized supervision and decision questions to that chat. Apply these technical decisions directly; ask the supervisor with evidence and a recommended alternative if a decision cannot safely work. Continue independent slices while awaiting an answer. Do not push, publish, merge or commit follow-up implementation without further instruction.
