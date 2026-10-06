import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPersisted } from '../prototype/extension/persistence.js';
test('readback accepts serialized dates and key reordering, preserving unknown fields', () => {
    const snapshot = { messages: [{ mes: 'reply', extra: { custom: true }, send_date: new Date('2026-01-01') }], metadata: { integrity: 'a', custom: 1 } };
    const saved = [{ chat_metadata: { custom: 1, integrity: 'a' } }, { extra: { custom: true }, send_date: '2026-01-01T00:00:00.000Z', mes: 'reply' }];
    assertPersisted(snapshot, saved);
    saved[1].extra.custom = false;
    assert.throws(() => assertPersisted(snapshot, saved), { code: 'PERSISTENCE_MISMATCH' });
});
test('missing records, truncated replies and changed metadata fail verification', () => {
    const snapshot = { messages: [{ mes: 'full answer' }], metadata: { integrity: 'expected' } };
    for (const saved of [{}, [], [{ chat_metadata: snapshot.metadata }, { mes: 'full' }], [{ chat_metadata: { integrity: 'other' } }, ...snapshot.messages]]) {
        assert.throws(() => assertPersisted(snapshot, saved), { code: 'PERSISTENCE_MISMATCH' });
    }
});

test('ST empty load-time world-info timers match absence, but nonempty timers stay protected', () => {
    const snapshot = { messages: [], metadata: { custom: 'keep', timedWorldInfo: { sticky: {}, cooldown: {} } } };
    assert.doesNotThrow(() => assertPersisted(snapshot, [{chat_metadata: {custom: 'keep'}}]));
    snapshot.metadata.timedWorldInfo.sticky.entry = 2;
    assert.throws(() => assertPersisted(snapshot, [{chat_metadata: {custom: 'keep'}}]), /does not match/);
    assert.throws(() => assertPersisted({...snapshot,metadata:{custom:'keep'}}, [{chat_metadata:{custom:'lost'}}]), /does not match/);
});
