// Applies exported ST-side data under the neutral `stm` namespace.
// `api` is injected: {getSettingsNs(), setSettingsNs(v), getCardNs(avatar), setCardNs(avatar,v),
// getChatNs(avatar,file), setChatNs(avatar,file,v)}. Every write is read back; a mismatch aborts
// and restores earlier writes. Existing different `stm` data is never overwritten silently.
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export async function importStData(data, api, {overwrite = false} = {}) {
  const steps = [];
  if (data.extensionSettings != null) steps.push({label: 'settings', get: () => api.getSettingsNs(), set: v => api.setSettingsNs(v), value: data.extensionSettings});
  for (const c of data.characterData ?? []) steps.push({label: `card ${c.avatar}`, get: () => api.getCardNs(c.avatar), set: v => api.setCardNs(c.avatar, v), value: c.value});
  for (const c of data.chatMetadata ?? []) steps.push({label: `chat ${c.avatar}/${c.file}`, get: () => api.getChatNs(c.avatar, c.file), set: v => api.setChatNs(c.avatar, c.file, v), value: c.value});
  const done = [], written = [];
  try {
    for (const s of steps) {
      const before = await s.get();
      if (same(before, s.value)) continue;
      if (before != null && !overwrite) throw new Error(`Refusing to overwrite existing stm data for ${s.label}.`);
      await s.set(s.value); done.push({s, before});
      if (!same(await s.get(), s.value)) throw new Error(`Readback failed for ${s.label}.`);
      written.push(s.label);
    }
  } catch (e) {
    for (const {s, before} of done.reverse()) await s.set(before ?? null);
    throw e;
  }
  return {written};
}
