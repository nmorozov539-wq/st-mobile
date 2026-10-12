import test from 'node:test';
import assert from 'node:assert/strict';
import {homeStatus, countText} from '../prototype/frontend/home.js';

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
test('counts', () => {
    assert.equal(countText(24), '24');
    assert.equal(countText(1000, true), `${(1000).toLocaleString()}+`);
    assert.equal(countText(undefined), '–');
    assert.equal(countText(-1), '–');
});
