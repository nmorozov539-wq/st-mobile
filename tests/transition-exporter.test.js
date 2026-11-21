import test from 'node:test';
import assert from 'node:assert/strict';
import {exportLegacy, validateBundle} from '../transition/exporter.js';
const store = o => { const m = new Map(Object.entries(o)); return {getItem: k => m.get(k) ?? null, setItem() { throw new Error('write'); }, removeItem() { throw new Error('write'); }, m}; };
const fixture = () => store({
  'pocket-tavern.v1.drafts': JSON.stringify({'["a.png","chat 1"]': 'hello'}),
  'pocket-tavern.appearance.v1': JSON.stringify({textSize: 18}),
  'pocket-tavern.themes.v1': JSON.stringify({version: 1, selected: 'x', themes: []}),
  'pocket-tavern.pending-changes.v1': JSON.stringify([{id: '1', state: 'pending'}]),
  'pocket-tavern.layout.v1': '{broken',
  'pocket-tavern.undo.v1': '{}',
});
test('exports neutral sections, flags pending as inert, records corruption', () => {
  const s = fixture(), b = exportLegacy(s, {now: () => 't'});
  assert.equal(b.sections.drafts.value['["a.png","chat 1"]'], 'hello');
  assert.equal(b.sections.appearance.value.textSize, 18);
  assert.equal(b.sections.pendingChanges.inert, true);
  assert.deepEqual(b.problems.map(p => p.key), ['pocket-tavern.layout.v1']);
  assert.ok(!('undo' in b.sections));
  validateBundle(b);
});
test('source is untouched and the export repeats identically', () => {
  const s = fixture(), before = JSON.stringify([...s.m]);
  const a = exportLegacy(s, {now: () => 't'}), b = exportLegacy(s, {now: () => 't'});
  assert.equal(JSON.stringify([...s.m]), before); assert.deepEqual(a, b);
});
test('rejects corrupt, tampered and foreign bundles', () => {
  const b = exportLegacy(fixture());
  assert.throws(() => validateBundle({...b, sections: {}}), /checksum/);
  assert.throws(() => validateBundle({schema: 'other'}), /Not an stm/);
  assert.throws(() => validateBundle(null));
});
test('unreadable storage is reported, not thrown', () => {
  const b = exportLegacy({getItem() { throw new Error('blocked'); }});
  assert.ok(b.problems.length > 0); validateBundle(b);
});
