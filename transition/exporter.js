// Transition exporter for 0.9.x. Reads legacy browser storage and writes a
// brand-neutral bundle. Read-only: it never modifies or deletes the source,
// and it never replays pending writes.
export const BUNDLE_SCHEMA = 'stm.migration.v1';
const L = 'pocket-tavern.';
// legacy key -> neutral section name. `inert` sections are kept for review only.
const MAP = [
  [L + 'v1.drafts', 'drafts', false], [L + 'v1.target', 'lastTarget', false],
  [L + 'appearance.v1', 'appearance', false], [L + 'layout.v1', 'layout', false],
  [L + 'themes.v1', 'themes', false], [L + 'color-themes.v1', 'colorThemes', false],
  [L + 'lists.v1', 'listPrefs', false], [L + 'wi-folders.v1', 'worldInfoFolders', false],
  [L + 'wi-view.v1', 'worldInfoView', false], [L + 'direct-endpoint.v1', 'directEndpoint', false],
  [L + 'pending-changes.v1', 'pendingChanges', true], [L + 'v1.pending', 'pendingOperation', true],
];
const SKIPPED = [L + 'char-colour.v2', L + 'diagnostics.v1', L + 'undo.v1', L + 'tools-notice'];

export function exportLegacy(storage, {now = () => new Date().toISOString(), origin = null} = {}) {
  const sections = {}, problems = [];
  for (const [key, name, inert] of MAP) {
    let raw; try { raw = storage.getItem(key); } catch (e) { problems.push({key, error: 'unreadable'}); continue; }
    if (raw == null) continue;
    try { sections[name] = {inert, value: JSON.parse(raw)}; }
    catch { problems.push({key, error: 'corrupt', raw}); }
  }
  const bundle = {schema: BUNDLE_SCHEMA, createdAt: now(), source: {origin, product: 'legacy-0.9'}, sections, problems, skipped: SKIPPED};
  bundle.checksum = checksum(body(bundle));
  return bundle;
}
const body = b => JSON.stringify({schema: b.schema, sections: b.sections, problems: b.problems});
export function checksum(text) { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }
export function validateBundle(b) {
  if (!b || typeof b !== 'object' || b.schema !== BUNDLE_SCHEMA) throw new Error('Not an stm migration bundle.');
  if (b.checksum !== checksum(body(b))) throw new Error('Bundle is corrupt: checksum mismatch.');
  return b;
}
