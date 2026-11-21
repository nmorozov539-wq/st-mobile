// Brand-neutral migration bundle: schema, integrity check, builder.
export const BUNDLE_SCHEMA = 'stm.migration.v1';
const body = b => JSON.stringify({schema: b.schema, sections: b.sections, problems: b.problems});
export function checksum(text) { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }
export function makeBundle({sections, problems = [], source = {}, createdAt = new Date().toISOString(), skipped = []}) {
  const b = {schema: BUNDLE_SCHEMA, createdAt, source, sections, problems, skipped};
  b.checksum = checksum(body(b)); return b;
}
export function validateBundle(b) {
  if (!b || typeof b !== 'object' || b.schema !== BUNDLE_SCHEMA) throw new Error('Not an stm migration bundle.');
  if (b.checksum !== checksum(body(b))) throw new Error('Bundle is corrupt: checksum mismatch.');
  return b;
}
