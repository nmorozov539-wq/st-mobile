import test from 'node:test';
import assert from 'node:assert/strict';
import {exportStData, summarize} from '../transition/st-data.js';
const input = () => ({
  settings: {extension_settings: {pocket_tavern: {version: 3, global: {model: 'm', apiKey: 'sk-x'}}, pocket_tavern_repairs: {a: 1}, note: {x: 1}}},
  characters: [{avatar: 'a.png', data: {extensions: {pocket_tavern: {color: '#fff'}}}}, {avatar: 'b.png', data: {extensions: {}}}],
  chats: [{avatar: 'a.png', file: 'c1', metadata: {pocket_tavern: {newChat: {id: 1}}}}, {avatar: 'a.png', file: 'c2', metadata: {}}],
});
test('collects only old-namespace data and strips secrets', () => {
  const d = exportStData(input());
  assert.deepEqual(d.extensionSettings, {version: 3, global: {model: 'm'}});
  assert.deepEqual(d.characterData, [{avatar: 'a.png', value: {color: '#fff'}}]);
  assert.equal(d.chatMetadata.length, 1);
  assert.deepEqual(summarize(d), {extensionSettings: true, cardRepairs: true, characters: 1, chats: 1});
});
test('does not mutate input and tolerates empty ST data', () => {
  const i = input(), before = JSON.stringify(i); exportStData(i); assert.equal(JSON.stringify(i), before);
  assert.deepEqual(summarize(exportStData({})), {extensionSettings: false, cardRepairs: false, characters: 0, chats: 0});
});
