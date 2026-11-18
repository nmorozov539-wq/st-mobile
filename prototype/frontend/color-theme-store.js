import {applyColorTheme, ColorThemeError, normalizeColorTheme} from './color-theme.js';
import {importSillyTavernTheme} from './st-theme-import.js';

export const COLOR_THEME_STORAGE_KEY = 'pocket-tavern.color-themes.v1';
const STORAGE_VERSION = 1;

const copy = value => JSON.parse(JSON.stringify(value));

function readStored(storage, builtInIds) {
    try {
        const value = JSON.parse(storage?.getItem(COLOR_THEME_STORAGE_KEY) ?? 'null');
        if (!value || value.version !== STORAGE_VERSION || !Array.isArray(value.themes)) return {selected: null, themes: []};
        const themes = [];
        for (const candidate of value.themes) {
            try {
                const theme = normalizeColorTheme(candidate);
                if (!builtInIds.has(theme.id) && !themes.some(item => item.id === theme.id)) themes.push(theme);
            } catch {}
        }
        return {selected: typeof value.selected === 'string' ? value.selected : null, themes};
    } catch {
        return {selected: null, themes: []};
    }
}

export function createColorThemeStore({
    storage = globalThis.localStorage,
    root = globalThis.document?.documentElement,
    builtInThemes,
    baseTheme,
} = {}) {
    const builtIns = (builtInThemes ?? [baseTheme]).map(normalizeColorTheme);
    if (!builtIns.length) throw new ColorThemeError('At least one built-in color theme is required.');
    const builtIn = new Map(builtIns.map(theme => [theme.id, theme]));
    if (builtIn.size !== builtIns.length) throw new ColorThemeError('Built-in color theme IDs must be unique.');
    const fallback = builtIns[0];
    const saved = readStored(storage, new Set(builtIn.keys()));
    let custom = new Map(saved.themes.map(theme => [theme.id, theme]));
    let selected = builtIn.has(saved.selected) || custom.has(saved.selected) ? saved.selected : fallback.id;
    let preview = null;

    const find = id => builtIn.get(id) ?? custom.get(id) ?? null;
    const persist = (nextSelected = selected, nextCustom = custom) => {
        if (!storage?.setItem) throw new ColorThemeError('Theme storage is unavailable.');
        storage.setItem(COLOR_THEME_STORAGE_KEY, JSON.stringify({
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
    const show = theme => applyColorTheme(theme, root);
    const showPreview = value => {
        preview = normalizeColorTheme(value);
        return copy(show(preview));
    };

    show(find(selected) ?? fallback);

    return {
        current() {
            return copy(preview ?? find(selected) ?? fallback);
        },
        list() {
            return [...builtIn.values(), ...custom.values()].map(theme => ({...copy(theme), builtIn: builtIn.has(theme.id)}));
        },
        select(id) {
            const theme = find(id);
            if (!theme) throw new ColorThemeError(`Unknown color theme: ${id}`);
            persist(id);
            selected = id;
            preview = null;
            return copy(show(theme));
        },
        preview(value) {
            return showPreview(value);
        },
        previewSillyTavern(value) {
            const result = importSillyTavernTheme(value, {baseTheme: fallback});
            showPreview(result.theme);
            return {theme: copy(result.theme), warnings: [...result.warnings]};
        },
        cancelPreview() {
            preview = null;
            return copy(show(find(selected) ?? fallback));
        },
        commitPreview() {
            if (!preview) throw new ColorThemeError('There is no color theme preview to save.');
            const theme = unique(preview), next = new Map(custom);
            next.set(theme.id, theme);
            persist(theme.id, next);
            custom = next;
            selected = theme.id;
            preview = null;
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
            return copy(show(find(selected) ?? fallback));
        },
        export(id = preview?.id ?? selected) {
            const theme = preview?.id === id ? preview : find(id);
            if (!theme) throw new ColorThemeError(`Unknown color theme: ${id}`);
            return `${JSON.stringify(theme, null, 2)}\n`;
        },
        reset() {
            if (!storage?.removeItem) throw new ColorThemeError('Theme storage is unavailable.');
            storage.removeItem(COLOR_THEME_STORAGE_KEY);
            custom = new Map();
            selected = fallback.id;
            preview = null;
            return copy(show(fallback));
        },
    };
}
