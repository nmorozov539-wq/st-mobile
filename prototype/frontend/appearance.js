// Global reading preferences. Stored on this device only; never sent to the engine.
export const STORAGE_KEY = 'pocket-tavern.appearance.v1';
export const DEFAULT_APPEARANCE = Object.freeze({textSize: 16, spacing: 'normal', background: 'gradient', thinking: 'collapsed', details: Object.freeze({time: true, clock: false, model: false, tokens: false})});
export const SPACING = {compact: 1.45, normal: 1.7, spacious: 1.95};
export const TEXT_SIZE = {min: 13, max: 24};

export function normalizeAppearance(raw) {
 const value = raw && typeof raw === 'object' ? raw : {};
 const size = Number(value.textSize);
 const details = value.details && typeof value.details === 'object' ? value.details : {};
 const flag = (name, fallback) => typeof details[name] === 'boolean' ? details[name] : fallback;
 return {
  textSize: Number.isInteger(size) ? Math.min(TEXT_SIZE.max, Math.max(TEXT_SIZE.min, size)) : DEFAULT_APPEARANCE.textSize,
  spacing: Object.hasOwn(SPACING, value.spacing) ? value.spacing : DEFAULT_APPEARANCE.spacing,
  background: value.background === 'plain' ? 'plain' : 'gradient',
  thinking: value.thinking === 'expanded' ? 'expanded' : 'collapsed',
  details: {time: flag('time', true), clock: flag('clock', false), model: flag('model', false), tokens: flag('tokens', false)},
 };
}
export function loadAppearance(storage) {
 try { return normalizeAppearance(JSON.parse(storage.getItem(STORAGE_KEY))); } catch { return normalizeAppearance(null); }
}
export function saveAppearance(storage, value) {
 const clean = normalizeAppearance(value);
 try { storage.setItem(STORAGE_KEY, JSON.stringify(clean)); } catch { /* Preferences still apply for this session. */ }
 return clean;
}
export function applyAppearance(value, root = document.documentElement) {
 const clean = normalizeAppearance(value);
 root.style.setProperty('--chat-font', `${clean.textSize}px`);
 root.style.setProperty('--chat-line', String(SPACING[clean.spacing]));
 root.dataset.background = clean.background;
 return clean;
}

/** Real metadata only: a detail is omitted when the saved message does not carry it. */
export function clockText(message) {
 const raw = message?.send_date;
 if (raw === undefined || raw === null || raw === '') return null;
 const date = new Date(raw);
 if (!Number.isFinite(date.getTime())) return null;
 return date.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
}
export function modelName(message) {
 const name = message?.extra?.model;
 return typeof name === 'string' && name.trim() ? name.trim() : null;
}
export function tokenText(message) {
 const count = message?.extra?.token_count;
 return Number.isInteger(count) && count > 0 ? `${count.toLocaleString()} tokens` : null;
}
