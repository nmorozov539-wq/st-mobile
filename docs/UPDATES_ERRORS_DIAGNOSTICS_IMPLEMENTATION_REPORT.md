# Git updates, errors and diagnostics — implementation report

Date: 19 November 2026  
Implementation baseline: `b56ca02`  
Planning/handoff commit: `aaf7388`  
Release line: Pocket Tavern 0.9.0 / SillyTavern 1.19.0

## Result

The browser/Termux follow-up is implemented as a separately reviewable working-tree change. It adds a stopped-installation Git updater with recoverable per-path transactions, one structured error contract, bounded native notice forwarding, launcher-owned rotating logs, and an authenticated loopback diagnostics viewer that survives an engine-child crash.

This report does **not** claim Android/WebView or real-phone qualification. It does not add remote administration, shell execution, automatic engine restart, Kotlin changes, arbitrary SillyTavern upgrades, commits, pushes, merges, deployment or release publication.

## Delivered surfaces

### Shared package staging and Git updates

- `phone-package/package-staging.cjs` is the single staging definition used by both ZIP builds and source-revision updates.
- `phone-package/update-from-git.cjs` resolves a validated ref through a local bare cache, stages a detached exact commit with repository hooks disabled, verifies a SHA-256 manifest and installs only managed paths.
- The installed ST version remains pinned to 1.19.0. Frontend, bridge, package build and protocol metadata must match.
- The launcher and updater contend through one lifecycle protocol backed by unique Lamport bakery claims in a stable private directory. A process publishes its own claim atomically, stale and partial claims are reclaimed only by their unique names, and release removes only a matching owner token. Legacy fixed-path locks are observed for compatibility but never unlinked by new contenders. An unresolved update journal blocks launch.
- Each replacement is write-ahead journaled before its filesystem rename. Recovery reconciles the filesystem with the last durable state and is idempotent, including interruption during recovery.
- Removed managed files are removed; unrecognized files and user data are untouched. Two verified code backups are retained. Rollback restores a matched manifest and refuses an incompatible schema boundary.
- The first Git update from the pre-manifest 0.9.0 baseline synthesizes a verified old manifest so that first-update rollback remains possible.
- Source URLs saved in installation metadata have embedded credentials removed. Git authentication remains Git's responsibility.

### Structured failures and native notices

- The serializable record carries bounded identity, timestamp, source, severity, category, operation/target/session context, summary/detail, provider evidence, outcome and allowlisted actions.
- Deterministic categories cover authentication, permission, payment/quota, rate limiting, missing model, context limit, provider failure, network/TLS/DNS, timeout, interrupted stream, engine loss, save verification failure and unknown errors. HTTP 429 is not described as insufficient balance.
- Composer failures stay visible with a readable summary, optional disclosure and safe user actions. Draft and uncertain-save review behavior remain intact; no paid operation is retried automatically.
- About → Diagnostics stores at most 100 deduplicated, normalized local events.
- A reversible wrapper forwards native error/warning notices while preserving original toast behavior and correlating only proven active operations.
- Authorization headers, credential query parameters and common quoted JSON secret fields are sanitized before records or logs are retained.

### Launcher logs and standalone diagnostics

- `start.cjs` now supervises rather than merely inherits child output. Both stdout and stderr are terminal-teed and captured with timestamp, source and severity.
- UTF-8 split chunks, ANSI/control sequences, oversized lines and burst pressure are bounded. The persisted log uses two private 1 MiB files plus a capped in-memory ring.
- The supervisor remains alive after engine exit, records exit metadata and shows **Engine stopped**. It does not restart or resend. Ctrl+C closes the viewer and terminates all owned children.
- `node start.cjs --diagnostics-only` opens prior logs without starting ST. `--diagnostics-port` provides an explicit loopback-only port override.
- The service binds `127.0.0.1` only. A random URL-fragment capability is exchanged for a narrowly named HttpOnly, SameSite=Strict cookie. API access enforces exact Host and Origin, sends no permissive CORS policy and exposes no arbitrary path or command endpoint.
- The viewer polls bounded cursor pages, resets on session/cursor changes, caps rendered rows and selection state at 1,000, renders log text inertly, and supports pause/follow, filters, older lines and selected-line copy.
- Export requires a still-valid immutable preview snapshot identifier. The downloaded bundle is exactly that preview; missing or expired snapshots return 409 rather than silently including newer logs.

## Support matrix

| Surface | Supported | Boundary |
|---|---|---|
| Git source | Local, SSH or HTTPS remote understood by installed Git | Pocket does not collect credentials or change remotes |
| Update selection | Validated branch, tag or commit; exact resolved commit recorded | Repository hooks and shell-built Git commands are disabled |
| Installation | Existing Pocket 0.9.0 combined installation, ST 1.19.0, same native-ownership schema | Arbitrary ST upgrades and cross-schema downgrade are refused |
| Recovery | Interrupted install/recovery reconciliation; no-op; last verified rollback; two backups | Keep ST stopped until the transaction completes |
| Data | Existing data, credentials, chats, themes, personal extensions and unknown files preserved | Managed Pocket code is replaced as a complete verified set |
| Errors | Enumerated deterministic categories plus safe unknown fallback | Not claimed as full coverage of every provider |
| Logs | ST/proxy/mock stdout and stderr; private bounded local files | Filtering cannot guarantee removal of arbitrary secrets or conversation text |
| Viewer | Same-device loopback browser, authenticated launcher session | Not remote administration; supervisor death makes the service unreachable |
| Export | User-previewed bounded build/status/log bundle | Never uploads automatically and never includes configuration dumps |
| Device qualification | Desktop Chromium mobile/tablet emulation | Android WebView, keyboard, gestures, insets and background lifetime remain unqualified |

## Security and privacy decisions

The standalone viewer is independent of the ST iframe so it remains reachable when only the engine child dies. Its bootstrap secret lives in a fragment, is erased after exchange and is not embedded in public frontend assets. Hostile Host/Origin requests, unauthenticated reads/exports and expired export snapshots are rejected. Content Security Policy is applied and terminal strings are inserted as text.

Logs and support exports can still contain conversation text, filenames and provider diagnostics after credential-pattern redaction. The UI and phone guide therefore tell the user to review the exact immutable preview. No bundle is uploaded automatically.

## Qualification evidence

The deterministic updater matrix uses a local two-revision remote and covers update, no-op, removed-file cleanup, rollback (including the first baseline update), dirty source preservation, authentication/offline/ref/busy failures, atomic launcher/updater contention, stale lifecycle ownership, every journal checkpoint, rename-before-journal persistence, recovery and interruption during recovery. User-data hashes are compared before and after update and rollback.

The diagnostics suites cover unauthorized and hostile Host/Origin access, session exchange, cursor reads, rotation, inert HTML, credential redaction in persistence/export, preview-bound export, expiry, diagnostics-only mode, engine-child crash retention and intentional child shutdown. The live viewer proof asserts **Engine stopped**, continued responsiveness, a 1,000-row DOM cap and inert HTML.

Visual QA evidence is in `docs/followup-evidence/visual-qa.json` with 320 px, 390 px dark, engine-stopped and tablet screenshots. The first review caught an oversized checkbox and crowded 320 px controls; the approved revision scopes touch sizes correctly and uses a deliberate mobile control grid.

Exact integrated assertions and the disposable candidate commit are recorded in `docs/followup-evidence/integrated-qualification.json`. That flow:

1. builds a disposable installation from baseline `b56ca02`;
2. creates a local bare Git remote from the current candidate;
3. updates via the real CLI and verifies the installed exact commit and unchanged private-data hash;
4. launches the installed mock package, saves a successful reply and induces a structured provider failure;
5. checks About → Diagnostics and responsive theme-family screenshots;
6. kills only the engine process, continues using the standalone viewer and exports the exact preview;
7. stops the supervisor, rolls back to baseline code and verifies the private-data hash again.

Representative commands:

```sh
node --test tests/package-staging.test.js tests/git-updater.test.js tests/error-record.test.js tests/log-supervisor.test.js
node --test tests/diagnostics-server.test.js tests/launcher-supervisor.test.js
PLAYWRIGHT_BROWSERS_PATH=/tmp/pocket-design-browser node tests/diagnostics-viewer-live.cjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/pocket-design-browser node tests/followup-integrated-live.cjs
python3 scripts/build-phone-package.py
unzip -t dist/pocket-tavern-combined-v0.9.0.zip
node tests/milestone-3-package-live.cjs
node tests/run.js
git diff --check
```

Loopback/browser commands require an environment that permits local listening sockets.

## Final review checkpoint

- Integrated baseline → Git update → generation/error → engine crash/view/export → rollback: passed. The disposable candidate commit was `5d214fa32cd0133a4856a92e289eb8cd7af4718f`; all machine-readable assertions passed with no browser page errors.
- Rebuilt package archive: `dist/pocket-tavern-combined-v0.9.0.zip`, SHA-256 `d7d179020b845cc31e8e97079b7d8d4b21278c52766f525fd149e5e1c31a5465`. `unzip -t` and the installed-package Playwright round trip passed.
- Complete test suite: 344 passed, 0 failed, 0 skipped.
- `git diff --check`: passed.
- Real phone: not run and not claimed.
- Repository mutations: no commit, push, merge, deployment or release.

## Repair-harness debt

The baseline full suite reported one empty-stderr repair assertion. Direct production invocation emitted the expected failure; the empty stderr was caused by the sandbox refusing the test's nested `spawnSync` with `EPERM`. The repair guard now accepts injected listener/failure dependencies for deterministic unit coverage while its production `beforeExit` behavior remains unchanged. This converts the environment-sensitive assertion into a direct behavior test instead of hiding or excusing it.

## Supervision follow-up

The supervisor's six review blockers were applied directly:

1. journal state is durable before each rename and recovery reconciles rename-before-persist states;
2. launcher and updater use one atomic lifecycle lock;
3. authorization and quoted-JSON secrets are redacted in persisted and exported logs;
4. viewer status polls live and rendered/selected state is bounded;
5. export is tied to an immutable expiring preview;
6. hostile Origin is rejected on GET as well as POST.
7. fixed-path stale-lock reclamation was replaced with unique bakery-protocol claims; deterministic multiprocess barriers prove that two stale observers cannot steal or unlink a replacement owner, and process death during partial publication, finalized ownership and ownership-bound release is covered.

No unresolved design decision currently requires scope expansion.
