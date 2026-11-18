import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyColorTheme, colorThemeToCssVariables, contrastRatio, loadAndApplyColorTheme, normalizeColor, normalizeColorTheme, parseColor, validateColorTheme} from '../prototype/frontend/color-theme.js';
import {importSillyTavernTheme} from '../prototype/frontend/st-theme-import.js';
import {COLOR_THEME_STORAGE_KEY, createColorThemeStore} from '../prototype/frontend/color-theme-store.js';

const hearth = JSON.parse(fs.readFileSync(new URL('../prototype/frontend/themes/hearth.json', import.meta.url), 'utf8'));
const memoryStorage = (initial = {}) => {
    const values = new Map(Object.entries(initial));
    return {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key),
        value: key => values.get(key),
    };
};
const themeRoot = () => ({style: {values: {}, setProperty(name, value) { this.values[name] = value; }}, dataset: {}});

test('Hearth is a complete versioned compatibility theme', () => {
    const result = validateColorTheme(hearth);
    assert.equal(result.valid, true, result.errors.join('\n'));
    assert.equal(result.theme.colors.canvas, '#141519');
    assert.equal(result.theme.colors.accent, '#d9b46a');
    assert.equal(result.theme.colors.characterFallback, '#d9b46a');
});

test('CSS color parsing accepts ST rgba and normalizes our hex format', () => {
    assert.deepEqual(parseColor('rgba(23, 30, 33, 0.61)'), {r: 23, g: 30, b: 33, a: 0.61});
    assert.equal(normalizeColor('rgb(217, 180, 106)'), '#d9b46a');
    assert.equal(normalizeColor('#fff8'), '#ffffff88');
    assert.equal(normalizeColor('rgba(1, 2, 3, 2)'), null);
});

test('validation rejects missing, transparent essential and future-version colors', () => {
    const missing = structuredClone(hearth); delete missing.colors.focus;
    assert.equal(validateColorTheme(missing).valid, false);
    const transparent = structuredClone(hearth); transparent.colors.canvas = '#14151980';
    assert.match(validateColorTheme(transparent).errors.join(' '), /canvas must be a valid opaque color/);
    const future = structuredClone(hearth); future.version = 2;
    assert.match(validateColorTheme(future).errors.join(' '), /version must be 1/);
});

test('theme resolution emits stable public and calculated CSS variables', () => {
    const variables = colorThemeToCssVariables(hearth);
    assert.equal(variables['--color-canvas'], '#141519');
    assert.equal(variables['--color-border-strong'], '#ffffff24');
    assert.equal(variables['--color-selected'], '#d9b46a24');
    assert.ok(variables['--color-danger-surface']);
    assert.equal(variables['--color-backdrop-soft'], '#0000004d');
    assert.equal(variables['--color-character-ink'], '#0b0c0e');
    const props = {}, root = {style: {setProperty: (name, value) => { props[name] = value; }}, dataset: {}};
    applyColorTheme(hearth, root);
    assert.equal(props['--color-accent'], '#d9b46a');
    assert.equal(props['color-scheme'], 'dark');
    assert.deepEqual(root.dataset, {colorScheme: 'dark', colorTheme: 'hearth'});
});

test('the interface loader fetches and applies a validated theme file', async () => {
    const props = {}, root = {style: {setProperty: (name, value) => { props[name] = value; }}, dataset: {}};
    const fetch = async (url, options) => {
        assert.equal(String(url), '/themes/hearth.json');
        assert.deepEqual(options, {cache: 'no-store'});
        return {ok: true, json: async () => hearth};
    };
    const theme = await loadAndApplyColorTheme('/themes/hearth.json', {fetch, root});
    assert.equal(theme.id, 'hearth');
    assert.equal(props['--color-canvas'], '#141519');
    assert.equal(props['color-scheme'], 'dark');
    assert.deepEqual(root.dataset, {colorScheme: 'dark', colorTheme: 'hearth'});
});

test('a failed theme load leaves the safe CSS fallback alone', async () => {
    const writes = [];
    const root = {style: {setProperty: (...args) => writes.push(args)}, dataset: {}};
    await assert.rejects(
        loadAndApplyColorTheme('/missing.json', {fetch: async () => ({ok: false, status: 404}), root}),
        /Could not load color theme \(404\)/,
    );
    assert.deepEqual(writes, []);
});

test('ST import translates only colors and calculates a complete safe theme', () => {
    const st = {
        name: 'Azure',
        main_text_color: 'rgba(171, 198, 223, 1)',
        italics_text_color: 'rgba(255, 255, 255, 1)',
        underline_text_color: 'rgba(188, 231, 207, 1)',
        quote_text_color: 'rgba(111, 133, 253, 1)',
        blur_tint_color: 'rgba(23, 30, 33, 0.61)',
        chat_tint_color: 'rgba(23, 23, 23, 0)',
        user_mes_blur_tint_color: 'rgba(0, 28, 174, 0.2)',
        bot_mes_blur_tint_color: 'rgba(0, 13, 57, 0.22)',
        shadow_color: 'rgba(0, 0, 0, 1)',
        border_color: 'rgba(0, 0, 0, 0.5)',
        custom_css: 'body { display: none; }',
        chat_width: 25,
        hideChatAvatars_enabled: true,
    };
    const {theme, warnings} = importSillyTavernTheme(st, {baseTheme: hearth});
    assert.equal(theme.id, 'st-azure');
    assert.equal(theme.source.type, 'sillytavern');
    assert.equal(theme.colors.canvas, '#000000');
    assert.equal(theme.colors.userMessage, '#001cae33');
    assert.ok(contrastRatio(theme.colors.onAccent, theme.colors.accent) >= 4.5);
    assert.equal(Object.hasOwn(theme, 'custom_css'), false);
    assert.equal(Object.hasOwn(theme, 'chat_width'), false);
    assert.deepEqual(warnings, ['Custom CSS was ignored.']);
    assert.doesNotThrow(() => normalizeColorTheme(theme));
});

test('incomplete ST themes use visible compatibility fallbacks and report them', () => {
    const {theme, warnings} = importSillyTavernTheme({name: 'Tiny', main_text_color: '#eeeeee'}, {baseTheme: hearth});
    assert.equal(theme.id, 'st-tiny');
    assert.ok(warnings.some(message => message.includes('chat_tint_color')));
    assert.ok(warnings.some(message => message.includes('border_color')));
    assert.equal(validateColorTheme(theme).valid, true);
});

test('theme store previews without saving and cancel restores the selection', () => {
    const storage = memoryStorage(), root = themeRoot();
    const store = createColorThemeStore({storage, root, baseTheme: hearth});
    const preview = structuredClone(hearth); preview.id = 'preview'; preview.name = 'Preview'; preview.colors.canvas = '#010203';
    store.preview(preview);
    assert.equal(store.current().id, 'preview');
    assert.equal(root.style.values['--color-canvas'], '#010203');
    assert.equal(storage.value(COLOR_THEME_STORAGE_KEY), undefined);
    store.cancelPreview();
    assert.equal(store.current().id, 'hearth');
    assert.equal(root.style.values['--color-canvas'], '#141519');
});

test('theme store saves, restores, exports and safely resets custom themes', () => {
    const storage = memoryStorage(), root = themeRoot();
    const first = createColorThemeStore({storage, root, baseTheme: hearth});
    const custom = structuredClone(hearth); custom.id = 'quiet'; custom.name = 'Quiet'; custom.colors.accent = '#abcdef';
    first.preview(custom);
    assert.equal(first.commitPreview().id, 'quiet');
    const restored = createColorThemeStore({storage, root: themeRoot(), baseTheme: hearth});
    assert.equal(restored.current().id, 'quiet');
    assert.equal(JSON.parse(restored.export()).colors.accent, '#abcdef');
    assert.equal(restored.reset().id, 'hearth');
    assert.equal(storage.value(COLOR_THEME_STORAGE_KEY), undefined);
});

test('theme store converts ST colors for preview and avoids import name collisions', () => {
    const storage = memoryStorage(), root = themeRoot();
    const store = createColorThemeStore({storage, root, baseTheme: hearth});
    const st = {name: 'Tiny', main_text_color: '#eeeeee'};
    const result = store.previewSillyTavern(st);
    assert.equal(result.theme.id, 'st-tiny');
    assert.ok(result.warnings.length);
    assert.equal(store.commitPreview().id, 'st-tiny');
    store.previewSillyTavern(st);
    assert.equal(store.commitPreview().id, 'st-tiny-2');
});

test('theme store ignores corrupt saved themes and refuses to delete Hearth', () => {
    const storage = memoryStorage({[COLOR_THEME_STORAGE_KEY]: JSON.stringify({version: 1, selected: 'broken', themes: [{nope: true}]})});
    const store = createColorThemeStore({storage, root: themeRoot(), baseTheme: hearth});
    assert.equal(store.current().id, 'hearth');
    assert.throws(() => store.remove('hearth'), /cannot be removed/);
    assert.throws(() => store.select('missing'), /Unknown color theme/);
});
