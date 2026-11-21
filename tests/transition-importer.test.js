import test from 'node:test';
import assert from 'node:assert/strict';
import {exportLegacy} from '../transition/exporter.js';
import {importBundle} from '../transition/importer.js';
const mem = (o = {}, failOn) => { const m = new Map(Object.entries(o)); return {m, getItem: k => m.get(k) ?? null, removeItem: k => m.delete(k), setItem(k, v) { if (k === failOn) throw new Error('quota'); m.set(k, v); }}; };
const bundle = () => exportLegacy(mem({'pocket-tavern.v1.drafts': '{"a":"hi"}', 'pocket-tavern.appearance.v1': '{"textSize":18}', 'pocket-tavern.pending-changes.v1': '[{"id":"1"}]'}), {now: () => 't'});
test('imports neutral keys, skips inert pending journals', () => {
  const t = mem(), r = importBundle(t, bundle());
  assert.equal(t.m.get('stm.v1.drafts'), '{"a":"hi"}'); assert.ok(!t.m.has('stm.pending-changes.v1'));
  assert.deepEqual(r.skippedInert, ['pendingChanges']);
  assert.ok([...t.m.keys()].every(k => !k.includes('pocket')));
});
test('repeat import is a no-op; differing existing data needs overwrite', () => {
  const t = mem(); importBundle(t, bundle()); assert.deepEqual(importBundle(t, bundle()).written, []);
  t.m.set('stm.v1.drafts', '{"a":"changed"}');
  assert.throws(() => importBundle(t, bundle()), /Refusing to overwrite/);
});
test('failure rolls back partial writes', () => {
  const t = mem({'stm.v1.drafts': '{"old":1}'}, 'stm.appearance.v1');
  assert.throws(() => importBundle(t, bundle(), {overwrite: true}), /quota/);
  assert.equal(t.m.get('stm.v1.drafts'), '{"old":1}'); assert.ok(!t.m.has('stm.appearance.v1'));
});
test('rejects a corrupt bundle before writing anything', () => {
  const t = mem(), b = bundle(); b.sections.drafts.value = {x: 1};
  assert.throws(() => importBundle(t, b), /checksum/); assert.equal(t.m.size, 0);
});
