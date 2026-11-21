// Neutral importer: accepts only the stm.migration.v1 bundle. No legacy-key support.
import {validateBundle} from './bundle.js';
const TARGET = {
  drafts: 'stm.v1.drafts', lastTarget: 'stm.v1.target', appearance: 'stm.appearance.v1', layout: 'stm.layout.v1',
  themes: 'stm.themes.v1', colorThemes: 'stm.color-themes.v1', listPrefs: 'stm.lists.v1',
  worldInfoFolders: 'stm.wi-folders.v1', worldInfoView: 'stm.wi-view.v1', directEndpoint: 'stm.direct-endpoint.v1',
};
// Inert sections (pending journals) are never written; they stay in the bundle for review.
export function importBundle(storage, bundle, {overwrite = false} = {}) {
  validateBundle(bundle);
  const plan = [];
  for (const [name, section] of Object.entries(bundle.sections)) {
    if (section.inert || !TARGET[name]) continue;
    const key = TARGET[name], text = JSON.stringify(section.value), existing = storage.getItem(key);
    if (existing === text) continue; // repeated import is a no-op
    if (existing !== null && !overwrite) throw new Error(`Refusing to overwrite existing ${key}. Import again with overwrite after review.`);
    plan.push({key, text, previous: existing});
  }
  const done = [];
  try {
    for (const p of plan) { storage.setItem(p.key, p.text); done.push(p); }
    for (const p of plan) if (storage.getItem(p.key) !== p.text) throw new Error(`Readback failed for ${p.key}.`);
  } catch (e) {
    for (const p of done.reverse()) p.previous === null ? storage.removeItem(p.key) : storage.setItem(p.key, p.previous);
    throw e;
  }
  return {written: plan.map(p => p.key), skippedInert: Object.entries(bundle.sections).filter(([, s]) => s.inert).map(([n]) => n)};
}
