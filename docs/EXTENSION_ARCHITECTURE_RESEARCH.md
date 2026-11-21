# Pocket extension architecture investigation

21 November 2026. Source investigation for the next phase; no architecture implementation or runtime tests performed.

Pocket's agreed product shape is an ST interface extension, usable in a browser, with optional Android capabilities supplied by the APK. No extension receives special treatment or must adopt a Pocket API. Group chats remain excluded; commands and function tools are included.

The evidence supports a hybrid as a candidate: Pocket owns navigation and visual framing; ST retains live extension surfaces; simple actions may be mirrored. The composer is the strongest case for retaining a native element. Chat rendering still needs a comparative prototype before choosing ownership.

## Evidence and coverage

ST baseline is 1.19.1 at `82b64a45c34facbc98ff4b9f33c067d3ccab6a17`. This investigation follows concrete paths in bundled Token Counter, Quick Replies, Translate, TTS, Image Generation and Memory, with supporting attachment scans in Gallery, Expressions, Vectors and Attachments. WIhero workspace source was inspected at `d281be0670f31e033884250e3f23030298cee316` as one local third-party specimen. This is a behavior sample, not a popularity survey or ecosystem compatibility percentage.

The local Summaryception vendor package is `5.5.4-pocket`, with documented Pocket changes. It cannot count as evidence that an unmodified third-party extension works. A future comparative trial must use an upstream, unmodified specimen instead.

## What can be exposed generically

| Behavior | Evidence | Candidate handling | Limit |
|---|---|---|---|
| Simple launcher opening a native dialog | Token Counter binds its menu entry to a function creating a Popup | Mirror the entry and activate its original connected element; display the native popup | Must preserve dynamic availability and handle resulting UI, not merely dispatch a click |
| Settings controls | Native handlers and state live with original settings DOM | Present the original settings subtree, preferably in place, with palette styling | Settings can pop out or rebuild; a cached root is not permanent |
| Native formatted text | MessageFormatter exposes the native sanitized formatting pipeline | Use that pipeline if Pocket retains separate message rendering | HTML output does not include later DOM decorations or interactive handlers; invoking twice may repeat hook side effects |
| Commands, prompts and tools | Existing ST registries and generation pipeline | Retain ST execution and surface its results, progress and errors | Pocket's present slash/tool blocks must eventually be removed with full lifecycle validation |
| Workspaces | WIhero creates its own body host, shadow root and history behavior | Let original workspace render above Pocket and yield interaction ownership | Generic detection and Back coordination remain unproven; do not inject a special WIhero adapter |

## Where mirroring becomes fragile

### Composer changes are not uniformly observable

[QuickReplySet.js](/home/Riv/SillyTavern/public/scripts/extensions/quick-reply/src/QuickReplySet.js:139) reads `#send_textarea`, combines its value with a reply, assigns a new value, focuses it, and may click `#send_but`. The assignment does not emit an input event in this path. Translate has both a direct jQuery value assignment and another path that explicitly emits input ([translate/index.js](/home/Riv/SillyTavern/public/scripts/extensions/translate/index.js:185), line 553).

Therefore, an ordinary input-event bridge is incomplete. DOM mutation observation alone is also not a reliable value-property observer. Polling, property interception or action-boundary reconciliation would introduce additional complexity and still require asynchronous testing. Retaining ST's textarea inside a Pocket presentation is the first option to test. Preserve selection, focus, surrounding form semantics and native send behavior, not merely its ID.

### Message actions need their original context and identity

[TTS](/home/Riv/SillyTavern/public/scripts/extensions/tts/index.js:158) resolves the selected message through `this.closest('.mes')` and its `mesid`. Forwarding to the original button is plausible if the native message still exists and represents the intended active chat.

[Image Generation](/home/Riv/SillyTavern/public/scripts/extensions/stable-diffusion/index.js:5149) goes further: it stores an abort controller against the native button, uses its busy class to interpret a second click as cancellation, finds the containing message, and updates media. A mirror must retain identity and current state across completion, cancellation and message rebuilding. Copying an icon is insufficient.

### A launcher can depend on physical placement

[Image Generation's menu](/home/Riv/SillyTavern/public/scripts/extensions/stable-diffusion/index.js:5025) creates a Popper dropdown anchored to the original button and uses document-level click/touch handling. A hidden original button can give the popup an unsuitable anchor. Forwarded and original clicks may also interact with outside-click closing; that is a runtime question.

Prefer displaying original controls in a coherent native region when geometry matters. Do not assume arbitrarily moving them into Pocket is safe: ancestors and delegated handlers can matter.

### Surface lifetime is controlled by extensions

[Memory's popout](/home/Riv/SillyTavern/public/scripts/extensions/memory/index.js:987) empties its settings container, recreates contents inside a floating panel, rebinds listeners and later returns content. Discovery must follow changes. Neither one manifest equals one surface nor a root discovered once is a lasting guarantee.

### Workspace navigation is independently owned

[WIhero](/home/Riv/Projects/st-wihero/src/ui/app.js:57) creates a body-level shadow host. At line 512 it pushes history and handles `popstate`; it also stops keyboard propagation to protect its editing interactions. Pocket must avoid responding to the same Back press by also closing its underlying screen.

Correction to an overly broad earlier concern: shadow DOM does not prevent inherited CSS custom properties from reaching a workspace. WIhero explicitly uses ST theme variables. Shared palette projection can therefore help; ordinary outer selectors still cannot restyle arbitrary shadow internals.

## Architecture candidates after inspection

| Candidate | Benefit | Outstanding cost |
|---|---|---|
| Current iframe with selective mirroring | Preserves existing isolation and implementation | Two drafts, two rendered chats, target coordination, hidden geometry and cross-document interaction |
| Same-document Pocket with its own chat and native composer | Removes the draft duplication problem and simplifies ST access while retaining Pocket message design | Message actions, decorations and active/displayed chat ownership still need coordination |
| Same-document Pocket around native chat and composer | Keeps extension actions and native rendering attached to the visible elements | Must prove Pocket layout, fans, swipe behavior and accessibility without breaking ST structure |

The middle candidate is now more specific than “mirror everything”: retain the native composer, host original complex surfaces, and compare separate versus native chat. Keeping a separate composer remains possible, but has a concrete maintenance cost demonstrated above.

A shared document does not serialize asynchronous operations or eliminate unsaved state. Extension actions should operate on the visible active chat. Browsing other saved chats needs a clearly separate read-only mode or an explicit activation step; it must not silently send contextual actions to a different chat.

## Browser and Android product boundary

[MainActivity.kt](/home/Riv/Projects/st-mobile/android/app/src/main/java/app/pockettavern/MainActivity.kt) already supplies a WebView, engine-service startup, file chooser handling and external-link routing. The inspected activity does not implement the proposed capability handshake or explicit Pocket Back bridge. Those are future work, not existing features to simply enable.

Keep the browser interface independent of Android. An optional versioned APK connection should advertise actual capabilities; Pocket should enable only those present. App detection alone is not authorization for privileged operations. Browser mode must remain functional without the connection, including when opened in an Android browser. Existing Android services can be retained while the interface connection changes.

## Comparative trials for the next phase

These are implementation specifications for later authorization, not work performed here. Apply them to the same unmodified extension versions in each candidate. No per-extension branches or modifications are allowed; fixes must address a shared ST pattern.

1. **Native composer in Pocket framing:** Quick Reply insert-only, insert-and-send, slash execution and Translate, including delayed completion. Pass: visible draft, selection and sent text agree; no duplicate send or draft loss.
2. **Action mirroring:** simple dialog launcher, per-message TTS, image generation and cancellation, anchored dropdown. Pass: correct target, busy state, placement and dismissal after message redraw and chat switching.
3. **Two chat approaches:** compare Pocket rendering using native formatting with styled native message DOM. Pass: message actions, formatting hooks, inline media, streaming, edits, swipes and deletion remain consistent; preserve Pocket's intended appearance.
4. **Dynamic native surfaces:** settings popout, persistent panel plus chat, shadow workspace and nested dialogs. Pass: no stale roots, hidden controls, focus theft or double Back handling.
5. **Lifecycle and platform:** disable/update reload, browser without APK, APK capability negotiation, file chooser and Android Back. Pass: recover drafts and saved state, restore one session, and expose only available platform features.
6. **Independent holdout:** choose at least one previously unadapted third-party extension after the generic approach exists. Record original version/revision and outcomes without introducing an extension-specific fix.

Record each behavior as integrated, functional through native fallback, blocked, or untested. A native fallback is useful but does not count as seamless Pocket integration. A successful sample does not establish universal compatibility.

## Next phase recommendation

Proceed toward Pocket as an ST interface extension with optional APK capabilities. Prototype native-composer preservation and original-surface hosting first. Compare both chat ownership approaches before migrating the full interface. Use mirroring as a bounded technique, not the premise that all extension UI can be translated automatically.

The main unresolved choice is chat ownership. The investigation provides concrete failure modes and pass criteria; only runtime and visual trials can settle that choice. No application code or installed extensions were changed.
