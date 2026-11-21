import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchStData} from '../transition/fetch-st.js';
test('collects data through ST endpoints and only issues read-style calls', async () => {
  const seen = [];
  const routes = {
    '/csrf-token': () => ({token: 't'}),
    '/api/settings/get': () => ({settings: JSON.stringify({extension_settings: {pocket_tavern: {version: 3}}})}),
    '/api/characters/all': () => [{avatar: 'a.png', data: {extensions: {pocket_tavern: {color: '#fff'}}}}],
    '/api/characters/chats': () => [{file_name: 'c1.jsonl'}],
    '/api/chats/get': () => [{chat_metadata: {pocket_tavern: {newChat: {id: 1}}}}, {mes: 'x'}],
  };
  const fetchImpl = async (url, opts) => { const p = new URL(url).pathname; seen.push(p); return {ok: true, json: async () => routes[p]()}; };
  const d = await fetchStData('http://x', {fetchImpl});
  assert.equal(d.extensionSettings.version, 3); assert.equal(d.characterData.length, 1); assert.equal(d.chatMetadata[0].file, 'c1');
  assert.ok(!seen.some(p => /save|delete|write/.test(p)));
});
test('fails loudly when ST rejects a call', async () => {
  await assert.rejects(fetchStData('http://x', {fetchImpl: async () => ({ok: false, status: 403})}), /403/);
});
