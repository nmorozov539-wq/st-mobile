# STM design brief

Current design intent for the new foundation, 21 November 2026. The foundation roadmap governs delivery and architecture. Preserve the useful experience of the 0.9.1 interface; test implementation choices rather than assuming its DOM must survive.

## Navigation and screens

- Keep Home, Chats, Library, World Info and Extensions accessible, with configurable navigation order and Home centrally placed by default.
- Library provides Characters and Personas with full editors. World Info is separate by default and optionally folded into Library without reducing its functions or losing return context.
- Home provides connection and preset status/entrances, Continue, recent chats and Start new chat. Configuration entrances reach ST-owned tools; avoid duplicate configuration ownership.
- General Settings uses a category index and dedicated topic pages. Targeted shortcuts open their tool directly and return to their origin.
- Retain message fans, sheets, swipe actions and contextual controls where compatible with the tested architecture. Preserve accessible alternatives to gestures.

## Reading and themes

- Preserve both long-form Reading and content-sized Messenger presentation. They share functionality, composer and navigation.
- User reading preferences take precedence over theme defaults. Changing a theme must not silently change message format.
- Retain the theme contract, typography, semantic icons, character accents, preview/import/export and safe reset.
- Check 320/390 px and tablet layouts, larger text, reduced motion, overflow, focus and keyboard states. Styling must not hide a useful function or remove recovery access.

## Extension surfaces

- Provide generic access to settings, actions, dialogs, persistent panels and full workspaces. No extension is mandatory, privileged or preselected as the editor replacement.
- Retain a functional base World Info experience. Extension workspaces are optional and must follow the same hosting rules as other extensions.
- Project ST palette variables first; adapt common controls only where behavior is preserved. Keep original complex controls when mirroring is unreliable.
- Preserve draft/save protections, correct operation targets, nested dismissal and one coherent notification owner.

The exact chat/composer ownership and resulting layout tradeoffs remain milestone 1 decisions. This brief preserves intent without declaring untested native-element adaptation complete.
