// Reads old-namespace data from a running ST through its own HTTP API. Read-only.
import {exportStData} from './st-data.js';
export async function fetchStData(base, {fetchImpl = fetch, cookie = ''} = {}) {
  const headers = {'Content-Type': 'application/json', ...(cookie ? {Cookie: cookie} : {})};
  const call = async (path, body) => {
    const r = await fetchImpl(base + path, body === undefined ? {headers} : {method: 'POST', headers, body: JSON.stringify(body)});
    if (!r.ok) throw new Error(`${path} failed: ${r.status}`);
    return r.json();
  };
  const token = (await call('/csrf-token')).token; headers['X-CSRF-Token'] = token;
  const settings = JSON.parse((await call('/api/settings/get', {})).settings);
  const characters = await call('/api/characters/all', {});
  const chats = [];
  for (const c of characters) {
    const list = await call('/api/characters/chats', {avatar_url: c.avatar});
    for (const item of Array.isArray(list) ? list : Object.values(list ?? {})) {
      const file = String(item.file_name ?? '').replace(/\.jsonl$/, '');
      if (!file) continue;
      const rows = await call('/api/chats/get', {avatar_url: c.avatar, file_name: file});
      if (Array.isArray(rows)) chats.push({avatar: c.avatar, file, metadata: rows[0]?.chat_metadata ?? {}});
    }
  }
  return exportStData({settings, characters, chats});
}
