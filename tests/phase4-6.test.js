import test from 'node:test';
import assert from 'node:assert/strict';
import {effectiveSettings} from '../prototype/frontend/scoped-settings.js';
import {arrangeCharacters, characterTags, chatGroups, chunk} from '../prototype/frontend/libraries.js';

// The per-chat / per-character preset storage the in-chat preset menu and the workshop rely on.
test('preset scope: chat beats character beats global; a switched-off copy falls through', () => {
    const global = {preset: 'Default', model: 'g-model', generation: {temperature: 1}};
    const character = {enabled: true, copy: {preset: 'Roleplay', model: 'c-model', generation: {temperature: .7}}};
    const chat = {enabled: true, copy: {preset: 'Terse', model: '', generation: {temperature: .3}}};
    assert.equal(effectiveSettings({global, character: null, chat: null}).scope, 'global');
    assert.equal(effectiveSettings({global, character, chat: null}).copy.preset, 'Roleplay');
    assert.equal(effectiveSettings({global, character, chat}).copy.preset, 'Terse');
    assert.equal(effectiveSettings({global, character, chat: {...chat, enabled: false}}).copy.preset, 'Roleplay');
    assert.equal(effectiveSettings({global, character: {...character, enabled: false}, chat: null}).copy.preset, 'Default');
    // The model follows its own scope: the chat copy has no model, so the character's applies.
    const value = effectiveSettings({global, character, chat});
    assert.equal(value.copy.model, 'c-model'); assert.equal(value.modelScope, 'character');
    // Reading never changes the stored copies.
    assert.equal(character.copy.generation.temperature, .7);
});
test('characters page: search, tag, sort and favourites first', () => {
    const cards = [
        {key: 'a', name: 'Aldous', tags: ['Drama'], added: 3},
        {key: 'b', name: 'bea', tags: ['Noir', 'Drama'], added: 1, fav: true},
        {key: 'c', name: 'Cid', tags: [], added: 2},
    ];
    assert.deepEqual(arrangeCharacters(cards, {sort: 'name'}).map(c => c.key), ['b', 'a', 'c']);
    assert.deepEqual(arrangeCharacters(cards, {sort: 'added'}).map(c => c.key), ['b', 'a', 'c']);
    assert.deepEqual(arrangeCharacters(cards, {sort: 'recent', recents: [{characterKey: 'c'}, {characterKey: 'a'}]}).map(c => c.key), ['b', 'c', 'a']);
    assert.deepEqual(arrangeCharacters(cards, {tag: 'Drama', sort: 'name'}).map(c => c.key), ['b', 'a']);
    assert.deepEqual(arrangeCharacters(cards, {tags: ['Drama','Noir'], sort: 'name'}).map(c => c.key), ['b']);
    assert.deepEqual(arrangeCharacters(cards, {query: 'noir'}).map(c => c.key), ['b']);
    assert.deepEqual(arrangeCharacters(cards, {query: 'ci'}).map(c => c.key), ['c']);
    assert.deepEqual(characterTags(cards), ['Drama', 'Noir']);
});
test('chats grouped by character keep recency order', () => {
    const rows = [{characterKey: 'a', chatId: '1'}, {characterKey: 'b', chatId: '2'}, {characterKey: 'a', chatId: '3'}];
    assert.deepEqual(chatGroups(rows).map(g => [g.characterKey, g.chats.map(c => c.chatId)]), [['a', ['1', '3']], ['b', ['2']]]);
    assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});
