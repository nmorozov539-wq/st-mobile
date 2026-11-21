// ST-side part of the transition export: the old-name namespaces the extension
// wrote inside ST-owned data. Pure functions over data already fetched from ST;
// ST chats, characters and lorebooks themselves are never copied or modified.
const OLD = 'pocket_tavern', OLD_REPAIRS = 'pocket_tavern_repairs';
const SECRET = /^(api_?key|api-key|secret|client_secret|password|authorization|cookie|access_token|refresh_token|auth_token|bearer_token)$/i;
const strip = v => Array.isArray(v) ? v.map(strip) : v && typeof v === 'object'
  ? Object.fromEntries(Object.entries(v).filter(([k]) => !SECRET.test(k)).map(([k, x]) => [k, strip(x)])) : v;

export function exportStData({settings, characters = [], chats = []} = {}) {
  const ext = settings?.extension_settings ?? {};
  const out = {
    extensionSettings: ext[OLD] === undefined ? null : strip(ext[OLD]),
    cardRepairs: ext[OLD_REPAIRS] === undefined ? null : strip(ext[OLD_REPAIRS]),
    characterData: [], chatMetadata: [],
  };
  for (const c of characters) {
    const v = c?.data?.extensions?.[OLD];
    if (v !== undefined) out.characterData.push({avatar: c.avatar, value: strip(v)});
  }
  for (const chat of chats) {
    const v = chat?.metadata?.[OLD];
    if (v !== undefined) out.chatMetadata.push({avatar: chat.avatar, file: chat.file, value: strip(v)});
  }
  return out;
}
// Counts only; lets the exporter show what will move before anything is written.
export const summarize = d => ({
  extensionSettings: d.extensionSettings !== null, cardRepairs: d.cardRepairs !== null,
  characters: d.characterData.length, chats: d.chatMetadata.length,
});
