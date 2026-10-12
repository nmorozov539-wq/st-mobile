import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceLines} from '../prototype/frontend/world-info.js';
import {sameEndpoint, PROXY_ENDPOINT} from '../prototype/frontend/settings-page.js';

test('book source labels name every kind of link', () => {
    assert.deepEqual(sourceLines([{type: 'global'}, {type: 'character', name: 'Moss', role: 'primary'}, {type: 'character', name: 'Ivy', role: 'additional'}, {type: 'chat', name: 'c'}, {type: 'persona', name: 'Me'}]),
        ['Global', 'Character · Moss · Primary', 'Character · Ivy · Additional', 'Chat', 'Persona · Me']);
    assert.deepEqual(sourceLines(), []);
    assert.deepEqual(sourceLines([{type: 'persona'}]), ['Persona']);
});
test('repeated links are shown once', () => {
    assert.deepEqual(sourceLines([{type: 'global'}, {type: 'global'}]), ['Global']);
});
test('endpoints compare without trailing slashes or spaces', () => {
    assert.ok(sameEndpoint(' http://127.0.0.1:8001/api/v1/ ', PROXY_ENDPOINT));
    assert.ok(!sameEndpoint('https://openrouter.ai/api/v1', PROXY_ENDPOINT));
    assert.ok(sameEndpoint(null, ''));
});
