import test from 'node:test';
import assert from 'node:assert/strict';
import * as wi from '../prototype/extension/worldinfo-data.js';

const book = () => ({ entries: {
    0: { uid: 0, key: ['a'], keysecondary: [], comment: 'Alpha', content: 'x', constant: false, vectorized: false, disable: false, displayIndex: 1, foreign: 5 },
    3: { uid: 3, key: [], comment: '', content: 'Always on', constant: true, vectorized: false, disable: true, displayIndex: 0 },
} });
const code = fn => { try { fn(); } catch (e) { return e.code; } return null; };

test('book names are validated and unique case-insensitively', () => {
    assert.equal(wi.validBookName('Lore', ['Other']), 'Lore');
    assert.equal(code(() => wi.validBookName('lore', ['Lore'])), 'NAME_EXISTS');
    assert.equal(wi.validBookName('Lore', ['Lore'], { ignore: 'Lore' }), 'Lore');
    for (const bad of ['', ' x', 'a/b', 'a.', 'a:b', '..', 'x'.repeat(121), 5]) assert.equal(code(() => wi.validBookName(bad, [])), 'INVALID_NAME', String(bad));
});
test('folders use the shared extensions.folder string', () => {
    assert.equal(wi.folderOf({ folder: ' Worlds ' }), 'Worlds');
    assert.equal(wi.folderOf({ folder: 'a/b' }), null);
    assert.equal(wi.folderOf(null), null);
    assert.equal(wi.validFolderName(' Hi '), 'Hi');
    assert.equal(code(() => wi.validFolderName('a/b')), 'INVALID_NAME');
});
test('entry changes reject unknown fields and bad values', () => {
    assert.equal(code(() => wi.checkEntryChanges({ uid: 4 })), 'INVALID_ARGUMENT');
    assert.equal(code(() => wi.checkEntryChanges({ position: 9 })), 'INVALID_ARGUMENT');
    assert.equal(code(() => wi.checkEntryChanges({ triggers: ['normal', 'normal'] })), 'INVALID_ARGUMENT');
    assert.equal(code(() => wi.checkEntryChanges({ constant: true, vectorized: true })), 'INVALID_ARGUMENT');
    assert.deepEqual(wi.checkEntryChanges({ scanDepth: null, key: [' a ', 'b'] }), { scanDepth: null, key: ['a', 'b'] });
});
test('applying changes keeps unknown fields and flips strategy flags', () => {
    const data = book();
    const touched = wi.applyEntryChanges(data, 0, { constant: true, comment: 'New' });
    assert.deepEqual(touched.sort(), ['comment', 'constant']);
    assert.equal(data.entries[0].foreign, 5);
    data.entries[0].vectorized = true;
    wi.applyEntryChanges(data, 0, { constant: true });
    assert.equal(data.entries[0].vectorized, false);
    assert.equal(code(() => wi.applyEntryChanges(data, 99, { comment: 'x' })), 'ENTRY_NOT_FOUND');
});
test('character filter edits preserve tags', () => {
    const data = book();
    data.entries[0].characterFilter = { isExclude: false, names: ['A'], tags: ['t1'] };
    wi.applyEntryChanges(data, 0, { characterFilterNames: ['B'], characterFilterExclude: true });
    assert.deepEqual(data.entries[0].characterFilter, { isExclude: true, names: ['B'], tags: ['t1'] });
    wi.applyEntryChanges(data, 3, { characterFilterNames: ['Z'] });
    assert.deepEqual(data.entries[3].characterFilter, { isExclude: false, names: ['Z'], tags: [] });
});
test('summaries are ordered and describe strategy', () => {
    const rows = wi.summarizeBook(book());
    assert.deepEqual(rows.map(r => [r.uid, r.title, r.strategy, r.disabled]), [[3, 'Always on', 'constant', true], [0, 'Alpha', 'keyword', false]]);
    assert.equal(wi.nextDisplayIndex(book()), 2);
    assert.equal(wi.nextDisplayIndex({ entries: {} }), 0);
});
test('revisions change when content changes', () => {
    const a = book(), b = book();
    assert.equal(wi.bookRevision(a), wi.bookRevision(b));
    b.entries[0].content = 'y';
    assert.notEqual(wi.bookRevision(a), wi.bookRevision(b));
});
test('activation settings enforce ranges and mutual exclusion', () => {
    assert.deepEqual(wi.checkActivationChanges({ world_info_depth: 5 }), { world_info_depth: 5 });
    assert.equal(code(() => wi.checkActivationChanges({ world_info_budget: 0 })), 'INVALID_ARGUMENT');
    assert.equal(code(() => wi.checkActivationChanges({ foo: 1 })), 'INVALID_ARGUMENT');
    assert.equal(code(() => wi.checkActivationChanges({ world_info_min_activations: 2 }, { world_info_max_recursion_steps: 3 })), 'INVALID_ARGUMENT');
    assert.ok(wi.checkActivationChanges({ world_info_min_activations: 2, world_info_max_recursion_steps: 0 }, { world_info_max_recursion_steps: 3 }));
});
test('imports accept native and character-book shapes', () => {
    assert.equal(code(() => wi.checkImportedBook({}, null)), 'INVALID_ARGUMENT');
    assert.equal(code(() => wi.checkImportedBook({ entries: [] }, null)), 'UNSUPPORTED');
    const converted = wi.checkImportedBook({ entries: [{ content: 'a' }] }, d => ({ entries: { 0: { content: d.entries[0].content } } }));
    assert.equal(converted.entries[0].content, 'a');
    assert.ok(wi.checkImportedBook(book(), null).entries);
});
