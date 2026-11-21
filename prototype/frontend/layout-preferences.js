export const LAYOUT_PREFERENCES_VERSION = 1;
export const REQUIRED_DESTINATIONS = ['wi', 'chats', 'home', 'library', 'extensions'];
export const MESSAGE_FORMATS = ['reading', 'messenger'];
export const DEFAULT_LAYOUT_PREFERENCES = Object.freeze({
    version: LAYOUT_PREFERENCES_VERSION,
    order: REQUIRED_DESTINATIONS,
    wiPlacement: 'destination',
    messageFormat: 'reading',
});

function uniqueKnownOrder(value) {
    const seen = new Set(), order = [];
    for (const id of Array.isArray(value) ? value : []) {
        if (REQUIRED_DESTINATIONS.includes(id) && !seen.has(id)) { seen.add(id); order.push(id); }
    }
    for (const id of REQUIRED_DESTINATIONS) if (!seen.has(id)) order.push(id);
    return order;
}

export function normalizeLayoutPreferences(value = {}) {
    const wiPlacement = value?.wiPlacement === 'library' ? 'library' : 'destination';
    const messageFormat = MESSAGE_FORMATS.includes(value?.messageFormat) ? value.messageFormat : 'reading';
    return {version: LAYOUT_PREFERENCES_VERSION, order: uniqueKnownOrder(value?.order), wiPlacement, messageFormat};
}

export function visibleDestinations(value) {
    const prefs = normalizeLayoutPreferences(value);
    return prefs.order.filter(id => id !== 'wi' || prefs.wiPlacement === 'destination');
}

export function wideLayoutEligible(width, rootFontSize = 16) {
    const pixels = Number(width), font = Number(rootFontSize);
    return Number.isFinite(pixels) && Number.isFinite(font) && pixels >= 900 && font < 24;
}

export function loadLayoutPreferences(storage) {
    try { return normalizeLayoutPreferences(JSON.parse(storage.getItem('stm.layout.v1') ?? '{}')); }
    catch { return normalizeLayoutPreferences(); }
}

export function saveLayoutPreferences(storage, value) {
    const normalized = normalizeLayoutPreferences(value);
    storage.setItem('stm.layout.v1', JSON.stringify(normalized));
    return normalized;
}
