// Pure World Info rules for the Pocket bridge. No ST imports, so everything here is unit-testable.
const fail = (code, message) => { throw Object.assign(new Error(message), { code }); };
export const GENERATION_TRIGGERS = ['normal', 'continue', 'impersonate', 'swipe', 'regenerate', 'quiet'];

/** Cheap stable fingerprint of a book's saved JSON; guards against editing a stale copy. */
export function bookRevision(data) {
    const text = JSON.stringify(data ?? null);
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return `${text.length}:${(hash >>> 0).toString(16)}`;
}

export function validBookName(name, existing = [], {ignore} = {}) {
    if (typeof name !== 'string' || !name.trim() || name !== name.trim() || name.length > 120) fail('INVALID_NAME', 'Enter a book name without leading or trailing spaces (up to 120 characters).');
    if (/[\\/<>:"|?*\x00-\x1f]/.test(name) || /[. ]$/.test(name) || name === '.' || name === '..') fail('INVALID_NAME', 'Use a book name without slashes, special filename characters or a trailing dot.');
    const lower = name.toLocaleLowerCase();
    if (existing.some(other => other !== ignore && other.toLocaleLowerCase() === lower)) fail('NAME_EXISTS', 'A World Info book with that name already exists.');
    return name;
}
export function validFolderName(name) {
    if (typeof name !== 'string') fail('INVALID_NAME', 'Enter a folder name.');
    const value = name.trim();
    if (!value || value.length > 80 || value.includes('/') || /[\x00-\x1f]/.test(value)) fail('INVALID_NAME', 'Use a folder name up to 80 characters without slashes.');
    return value;
}
/** Folder metadata is shared with the WorldInfoDrawer extension: a plain string in the book's own `extensions.folder`. */
export function folderOf(extensions) {
    const value = extensions && typeof extensions === 'object' ? extensions.folder : null;
    if (typeof value !== 'string') return null;
    const folder = value.trim();
    return folder && !folder.includes('/') ? folder : null;
}

const bad = () => fail('INVALID_ARGUMENT', 'An entry field has an unsupported value.');
const bool = v => { if (typeof v !== 'boolean') bad(); return v; };
const text = max => v => { if (typeof v !== 'string' || v.length > max) bad(); return v; };
const int = (min, max) => v => { if (!Number.isInteger(v) || v < min || v > max) bad(); return v; };
const nullable = rule => v => v === null ? null : rule(v);
const list = (max, itemMax) => v => { if (!Array.isArray(v) || v.length > max || v.some(item => typeof item !== 'string' || !item.trim() || item.length > itemMax)) bad(); return v.map(item => item.trim()); };
const triggers = v => { if (!Array.isArray(v) || new Set(v).size !== v.length || v.some(item => !GENERATION_TRIGGERS.includes(item))) bad(); return v; };

/** Every editable entry field and how it is validated. Unknown fields are rejected, never silently stored. */
export const ENTRY_RULES = {
    comment: text(5000), content: text(1_000_000), key: list(500, 2000), keysecondary: list(500, 2000),
    constant: bool, vectorized: bool, selective: bool, addMemo: bool, disable: bool, ignoreBudget: bool,
    excludeRecursion: bool, preventRecursion: bool, groupOverride: bool, useProbability: bool,
    matchPersonaDescription: bool, matchCharacterDescription: bool, matchCharacterPersonality: bool,
    matchCharacterDepthPrompt: bool, matchScenario: bool, matchCreatorNotes: bool,
    selectiveLogic: int(0, 3), position: int(0, 7), role: int(0, 2), order: int(-100_000_000, 100_000_000),
    depth: int(0, 10000), probability: int(0, 100), groupWeight: int(0, 100000), delayUntilRecursion: int(0, 100000),
    scanDepth: nullable(int(0, 1000)), sticky: nullable(int(0, 100000)), cooldown: nullable(int(0, 100000)), delay: nullable(int(0, 100000)),
    caseSensitive: nullable(bool), matchWholeWords: nullable(bool), useGroupScoring: nullable(bool),
    outletName: text(200), group: text(200), automationId: text(200), triggers,
    characterFilterNames: list(200, 200), characterFilterExclude: bool,
};

export function checkEntryChanges(changes) {
    if (!changes || typeof changes !== 'object' || Array.isArray(changes)) bad();
    const clean = {};
    for (const [field, value] of Object.entries(changes)) {
        if (!Object.hasOwn(ENTRY_RULES, field)) fail('INVALID_ARGUMENT', `Unsupported entry field: ${field}.`);
        clean[field] = ENTRY_RULES[field](value);
    }
    if (clean.constant === true && clean.vectorized === true) fail('INVALID_ARGUMENT', 'An entry cannot be both constant and vectorized.');
    return clean;
}

/** Applies validated changes to one entry in place. Unlisted fields (uid, displayIndex, unknown native keys) are untouched. */
export function applyEntryChanges(data, uid, changes) {
    const entry = data?.entries?.[uid];
    if (!entry) fail('ENTRY_NOT_FOUND', 'That entry no longer exists. Reload the book.');
    const clean = checkEntryChanges(changes);
    const filterTouched = Object.hasOwn(clean, 'characterFilterNames') || Object.hasOwn(clean, 'characterFilterExclude');
    if (clean.constant === true && entry.vectorized && clean.vectorized === undefined) clean.vectorized = false;
    if (clean.vectorized === true && entry.constant && clean.constant === undefined) clean.constant = false;
    const touched = [];
    for (const [field, value] of Object.entries(clean)) {
        if (field === 'characterFilterNames' || field === 'characterFilterExclude') continue;
        entry[field] = value; touched.push(field);
    }
    if (filterTouched) {
        const filter = entry.characterFilter && typeof entry.characterFilter === 'object' && !Array.isArray(entry.characterFilter) ? entry.characterFilter : {};
        entry.characterFilter = { isExclude: false, names: [], tags: [], ...filter };
        if (!Array.isArray(entry.characterFilter.names)) entry.characterFilter.names = [];
        if (!Array.isArray(entry.characterFilter.tags)) entry.characterFilter.tags = [];
        if (Object.hasOwn(clean, 'characterFilterNames')) entry.characterFilter.names = clean.characterFilterNames;
        if (Object.hasOwn(clean, 'characterFilterExclude')) entry.characterFilter.isExclude = clean.characterFilterExclude;
        touched.push('characterFilter');
    }
    return touched;
}

export function nextDisplayIndex(data) {
    return Object.values(data?.entries ?? {}).reduce((max, entry) => Math.max(max, Number.isFinite(entry?.displayIndex) ? entry.displayIndex : -1), -1) + 1;
}

export function entryStrategy(entry) { return entry?.constant ? 'constant' : entry?.vectorized ? 'vectorized' : 'keyword'; }
export function entryTitle(entry) {
    const comment = typeof entry?.comment === 'string' ? entry.comment.trim() : '';
    if (comment) return comment;
    const keys = Array.isArray(entry?.key) ? entry.key.filter(Boolean).slice(0, 3).join(', ') : '';
    if (keys) return keys;
    const line = typeof entry?.content === 'string' ? entry.content.split(/\r?\n/).find(item => item.trim()) : '';
    return line ? line.trim().slice(0, 80) : `Entry ${entry?.uid ?? ''}`.trim();
}
/** Compact rows for browsing. Full entries are loaded one at a time. */
export function summarizeBook(data) {
    return Object.entries(data?.entries ?? {}).map(([uid, entry]) => ({ uid: Number(entry?.uid ?? uid), title: entryTitle(entry), disabled: !!entry?.disable, strategy: entryStrategy(entry), order: Number.isFinite(entry?.displayIndex) ? entry.displayIndex : Number(uid) }))
        .sort((a, b) => a.order - b.order || a.uid - b.uid);
}

/** Global activation settings, with native ranges and the Min Activations / Max Recursion Steps exclusion. */
export const ACTIVATION_RULES = {
    world_info_depth: int(0, 1000), world_info_budget: int(1, 100), world_info_budget_cap: int(0, 65536),
    world_info_min_activations: int(0, 100), world_info_min_activations_depth_max: int(0, 100), world_info_max_recursion_steps: int(0, 10),
    world_info_character_strategy: int(0, 2),
    world_info_include_names: bool, world_info_recursive: bool, world_info_overflow_alert: bool,
    world_info_case_sensitive: bool, world_info_match_whole_words: bool, world_info_use_group_scoring: bool,
};
export function checkActivationChanges(changes, current = {}) {
    if (!changes || typeof changes !== 'object' || Array.isArray(changes) || !Object.keys(changes).length) fail('INVALID_ARGUMENT', 'There are no activation settings to save.');
    const clean = {};
    for (const [key, value] of Object.entries(changes)) {
        if (!Object.hasOwn(ACTIVATION_RULES, key)) fail('INVALID_ARGUMENT', `Unsupported activation setting: ${key}.`);
        clean[key] = ACTIVATION_RULES[key](value);
    }
    const next = { ...current, ...clean };
    if (next.world_info_min_activations > 0 && next.world_info_max_recursion_steps > 0) fail('INVALID_ARGUMENT', 'Min Activations and Max Recursion Steps are mutually exclusive. Set one to 0.');
    return clean;
}

/** Accepts native ST book JSON (entries as an object) and character-book style JSON (entries as a list). */
export function checkImportedBook(data, convertCharacterBook) {
    if (!data || typeof data !== 'object' || Array.isArray(data) || !('entries' in data)) fail('INVALID_ARGUMENT', 'This is not a World Info file: it has no entries.');
    let book = data;
    if (Array.isArray(data.entries)) {
        if (typeof convertCharacterBook !== 'function') fail('UNSUPPORTED', 'This lorebook format cannot be converted here.');
        book = convertCharacterBook(structuredClone(data));
    }
    if (!book.entries || typeof book.entries !== 'object' || Array.isArray(book.entries)) fail('INVALID_ARGUMENT', 'This is not a World Info file: its entries are unreadable.');
    if (Object.keys(book.entries).length > 20000) fail('INVALID_ARGUMENT', 'This book has too many entries for the phone.');
    return book;
}
