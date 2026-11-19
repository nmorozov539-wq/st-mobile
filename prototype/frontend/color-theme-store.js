import {applyTheme, ColorThemeError, normalizeTheme} from './color-theme.js';
import {importSillyTavernTheme} from './st-theme-import.js';

export const THEME_STORAGE_KEY = 'pocket-tavern.themes.v1';
export const COLOR_THEME_STORAGE_KEY = 'pocket-tavern.color-themes.v1';
const STORAGE_VERSION = 1;

const copy = value => JSON.parse(JSON.stringify(value));

function readStored(storage, builtInIds) {
    try {
        const current = storage?.getItem(THEME_STORAGE_KEY), legacy = storage?.getItem(COLOR_THEME_STORAGE_KEY);
        const raw = current ?? legacy;
        if (raw == null) return {selected: null, themes: [], recovered: false};
        const value = JSON.parse(raw);
        if (!value || value.version !== STORAGE_VERSION || !Array.isArray(value.themes)) return {selected: null, themes: [], recovered: true};
        const themes = [];
        let recovered = false;
        for (const candidate of value.themes) {
            try {
                const theme = normalizeTheme(candidate);
                if (!builtInIds.has(theme.id) && !themes.some(item => item.id === theme.id)) themes.push(theme);
                else recovered = true;
            } catch { recovered = true; }
        }
        if (typeof value.selected !== 'string') recovered = true;
        return {selected: typeof value.selected === 'string' ? value.selected : null, themes, recovered};
    } catch {
        return {selected: null, themes: [], recovered: true};
    }
}

export function createThemeStore({
    storage = globalThis.localStorage,
    root = globalThis.document?.documentElement,
    builtInThemes,
    baseTheme,
    onApply = () => {},
} = {}) {
    const builtIns = (builtInThemes ?? [baseTheme]).map(normalizeTheme);
    if (!builtIns.length) throw new ColorThemeError('At least one built-in color theme is required.');
    const builtIn = new Map(builtIns.map(theme => [theme.id, theme]));
    if (builtIn.size !== builtIns.length) throw new ColorThemeError('Built-in color theme IDs must be unique.');
    const fallback = builtIns[0];
    const saved = readStored(storage, new Set(builtIn.keys()));
    let custom = new Map(saved.themes.map(theme => [theme.id, theme]));
    let recovered = saved.recovered || (saved.selected !== null && !builtIn.has(saved.selected) && !custom.has(saved.selected));
    let selected = builtIn.has(saved.selected) || custom.has(saved.selected) ? saved.selected : fallback.id;
    let preview = null, previewSourceId = null;

    const find = id => builtIn.get(id) ?? custom.get(id) ?? null;
    const persist = (nextSelected = selected, nextCustom = custom) => {
        if (!storage?.setItem) throw new ColorThemeError('Theme storage is unavailable.');
        storage.setItem(THEME_STORAGE_KEY, JSON.stringify({
            version: STORAGE_VERSION,
            selected: nextSelected,
            themes: [...nextCustom.values()],
        }));
    };
    const unique = theme => {
        if (!find(theme.id)) return theme;
        let number = 2;
        while (find(`${theme.id}-${number}`)) number++;
        return {...theme, id: `${theme.id}-${number}`, name: `${theme.name} ${number}`};
    };
    const show = theme => { const applied = applyTheme(theme, root); onApply(copy(applied)); return applied; };
    const showPreview = value => {
        preview = normalizeTheme(value);
        return copy(show(preview));
    };

    show(find(selected) ?? fallback);

    return {
        current() {
            return copy(preview ?? find(selected) ?? fallback);
        },
        selectedId() { return selected; },
        needsRecovery() { return recovered; },
        previewing() { return !!preview; },
        list() {
            return [...builtIn.values(), ...custom.values()].map(theme => ({...copy(theme), builtIn: builtIn.has(theme.id)}));
        },
        select(id) {
            const theme = find(id);
            if (!theme) throw new ColorThemeError(`Unknown color theme: ${id}`);
            persist(id);
            selected = id;
            recovered = false;
            preview = null;
            previewSourceId = null;
            return copy(show(theme));
        },
        preview(value) {
            previewSourceId = null;
            return showPreview(value);
        },
        previewId(id) {
            const theme = find(id);
            if (!theme) throw new ColorThemeError(`Unknown color theme: ${id}`);
            previewSourceId = id;
            return showPreview(theme);
        },
        previewSillyTavern(value) {
            const result = importSillyTavernTheme(value, {baseTheme: fallback});
            previewSourceId = null;
            showPreview(result.theme);
            return {theme: copy(result.theme), warnings: [...result.warnings]};
        },
        cancelPreview() {
            preview = null;
            previewSourceId = null;
            return copy(show(find(selected) ?? fallback));
        },
        commitPreview() {
            if (!preview) throw new ColorThemeError('There is no color theme preview to save.');
            if (previewSourceId && find(previewSourceId)) {
                const id = previewSourceId;
                persist(id); selected = id; preview = null; previewSourceId = null;
                recovered = false;
                return copy(show(find(id)));
            }
            const theme = unique(preview), next = new Map(custom);
            next.set(theme.id, theme);
            persist(theme.id, next);
            custom = next;
            selected = theme.id;
            recovered = false;
            preview = null;
            previewSourceId = null;
            return copy(show(theme));
        },
        remove(id) {
            if (builtIn.has(id)) throw new ColorThemeError('Built-in color themes cannot be removed.');
            if (!custom.has(id)) throw new ColorThemeError(`Unknown color theme: ${id}`);
            const next = new Map(custom); next.delete(id);
            const nextSelected = selected === id ? fallback.id : selected;
            persist(nextSelected, next);
            custom = next;
            selected = nextSelected;
            preview = null;
            previewSourceId = null;
            return copy(show(find(selected) ?? fallback));
        },
        export(id = preview?.id ?? selected) {
            const theme = preview?.id === id ? preview : find(id);
            if (!theme) throw new ColorThemeError(`Unknown color theme: ${id}`);
            return `${JSON.stringify(theme, null, 2)}\n`;
        },
        reset() {
            if (!storage?.removeItem) throw new ColorThemeError('Theme storage is unavailable.');
            storage.removeItem(THEME_STORAGE_KEY);
            storage.removeItem(COLOR_THEME_STORAGE_KEY);
            custom = new Map();
            selected = fallback.id;
            recovered = false;
            preview = null;
            previewSourceId = null;
            return copy(show(fallback));
        },
    };
}

export const createColorThemeStore = createThemeStore;
