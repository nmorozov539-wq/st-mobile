import test from 'node:test';
import assert from 'node:assert/strict';
import {importStData} from '../transition/st-import.js';
const fake = (init = {}, breakOn) => { const m = {settings: null, 'card:a': null, 'chat:a/c': null, ...init};
  return {m, getSettingsNs: async () => m.settings, setSettingsNs: async v => { m.settings = v; },
    getCardNs: async a => m['card:' + a], setCardNs: async (a, v) => { m['card:' + a] = v; },
    getChatNs: async (a, f) => m[`chat:${a}/${f}`], setChatNs: async (a, f, v) => { if (breakOn) return; m[`chat:${a}/${f}`] = v; }}; };
const data = {extensionSettings: {version: 3}, characterData: [{avatar: 'a', value: {color: '#fff'}}], chatMetadata: [{avatar: 'a', file: 'c', value: {x: 1}}]};
test('writes all three namespaces and repeats as a no-op', async () => {
  const a = fake(); assert.equal((await importStData(data, a)).written.length, 3);
  assert.deepEqual(a.m.settings, {version: 3}); assert.deepEqual((await importStData(data, a)).written, []);
});
test('refuses to overwrite different existing data unless told to', async () => {
  const a = fake({settings: {version: 9}}); await assert.rejects(importStData(data, a), /Refusing/);
  assert.equal((await importStData(data, a, {overwrite: true})).written.length, 3);
});
test('failed readback restores earlier writes', async () => {
  const a = fake({}, true); await assert.rejects(importStData(data, a), /Readback/);
  assert.equal(a.m.settings, null); assert.equal(a.m['card:a'], null);
});
