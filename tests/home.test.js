import test from 'node:test';
import assert from 'node:assert/strict';
import {homeStatus, homeDot, castOrder} from '../prototype/frontend/home.js';
import {plainPreview} from '../prototype/frontend/preview.js';

const base = {connected: true, initializing: false, generating: false, onlineStatus: 'Valid', apiChecked: false};
test('engine states', () => {
    assert.deepEqual(homeStatus(base).engine, {label: 'Connected', tone: 'ok'});
    assert.equal(homeStatus({...base, connected: false}).engine.label, 'Not connected');
    assert.equal(homeStatus({...base, initializing: true}).engine.label, 'Connecting…');
    assert.equal(homeStatus({...base, generating: true}).engine.label, 'Working');
});
test('API status uses only known state', () => {
    assert.equal(homeStatus(base).api.label, 'Connected');
    assert.equal(homeStatus({...base, onlineStatus: 'no_connection'}).api.label, 'Not checked');
    assert.equal(homeStatus({...base, onlineStatus: 'no_connection', apiChecked: true}).api.label, 'Not connected');
    assert.equal(homeStatus({...base, onlineStatus: undefined}).api.label, 'Not checked');
    assert.equal(homeStatus({...base, connected: false, onlineStatus: 'Valid'}).api.label, 'Not checked');
});
test('one status dot, words only when something needs attention', () => {
    assert.deepEqual([homeDot(homeStatus(base)).tone, homeDot(homeStatus(base)).text], ['ok', '']);
    assert.equal(homeDot(homeStatus({...base, initializing: true})).text, 'Connecting…');
    assert.equal(homeDot(homeStatus({...base, connected: false})).tone, 'bad');
    assert.deepEqual([homeDot(homeStatus({...base, onlineStatus: 'no_connection', apiChecked: true})).tone, homeDot(homeStatus({...base, onlineStatus: 'no_connection', apiChecked: true})).text], ['warn', 'API not connected']);
    assert.equal(homeDot(homeStatus({...base, onlineStatus: undefined})).tone, 'idle');
    assert.match(homeDot(homeStatus(base)).label, /Engine: Connected · API: Connected/);
});
test('portrait row puts recently played characters first', () => {
    const chars = ['a', 'b', 'c', 'd'].map(key => ({key, name: key}));
    const recents = [{characterKey: 'c'}, {characterKey: 'gone'}, {characterKey: 'a'}, {characterKey: 'c'}];
    assert.deepEqual(castOrder(chars, recents).map(c => c.key), ['c', 'a', 'b', 'd']);
    assert.equal(castOrder(chars, [], 2).length, 2);
});
test('previews drop markdown and markup', () => {
    assert.equal(plainPreview('*She smiles.* "Hello," she says. **Loudly.**'), 'She smiles. "Hello," she says. Loudly.');
    assert.equal(plainPreview('<scene mood="x"><place>the lamp room</place>Hi</scene>'), 'the lamp room Hi');
    assert.equal(plainPreview('# Title\n> quoted\n- item\n1. first'), 'Title quoted item first');
    assert.equal(plainPreview('_Tom spits._ snake_case stays [map](http://x.y) ![pic](a.png)'), 'Tom spits. snake_case stays map');
    assert.equal(plainPreview('```js\ncode()\n```\nafter `tick`'), 'after tick');
    assert.equal(plainPreview('<think>secret</think>Visible &amp; fine &lt;3'), 'Visible & fine <3');
    assert.equal(plainPreview('a'.repeat(300), 10), 'aaaaaaaaa…');
    assert.equal(plainPreview(undefined), '');
});
