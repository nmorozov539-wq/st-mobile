import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyColorTheme, colorThemeToCssVariables, contrastRatio, loadAndApplyColorTheme, normalizeColor, normalizeColorTheme, normalizeTheme, parseColor, resolveCharacterAccent, THEME_KIND, THEME_VERSION, upgradeColorTheme, validateColorTheme, validateTheme} from '../prototype/frontend/color-theme.js';
import {importSillyTavernTheme} from '../prototype/frontend/st-theme-import.js';
import {COLOR_THEME_STORAGE_KEY, createColorThemeStore, createThemeStore, THEME_STORAGE_KEY} from '../prototype/frontend/color-theme-store.js';

const hearth = JSON.parse(fs.readFileSync(new URL('../prototype/frontend/themes/hearth.json', import.meta.url), 'utf8'));
const paper = JSON.parse(fs.readFileSync(new URL('../prototype/frontend/themes/paper.json', import.meta.url), 'utf8'));
const nocturne = JSON.parse(fs.readFileSync(new URL('../prototype/frontend/themes/nocturne.json', import.meta.url), 'utf8'));
const monolith = JSON.parse(fs.readFileSync(new URL('../prototype/frontend/themes/monolith.json', import.meta.url), 'utf8'));
const frontend = new URL('../prototype/frontend/', import.meta.url);
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

test('Hearth is a complete unified theme', () => {
    const result = validateTheme(hearth);
    assert.equal(result.valid, true, result.errors.join('\n'));
    assert.equal(result.theme.colors.canvas, '#141519');
    assert.equal(result.theme.colors.accent, '#d9b46a');
    assert.equal(result.theme.colors.characterFallback, '#d9b46a');
    assert.equal(result.theme.shape.mediumRadius, 10);
    assert.deepEqual(result.theme.presentation, {density: 'comfortable', messages: 'reading'});
});

test('legacy color themes upgrade with safe Hearth visuals', () => {
    const legacy = structuredClone(hearth); legacy.kind = 'ui-color-theme'; legacy.version = 1; delete legacy.shape; delete legacy.effects; delete legacy.presentation; delete legacy.motion; delete legacy.typography; delete legacy.icons; delete legacy.characterAccent;
    const upgraded = upgradeColorTheme(legacy);
    assert.equal(upgraded.kind, THEME_KIND);
    assert.equal(upgraded.version, THEME_VERSION);
    assert.equal(normalizeTheme(legacy).shape.largeRadius, 16);
    assert.equal(normalizeTheme(legacy).effects.blur, 8);
});

test('complete v1 themes upgrade with bounded typography, icons and character accents', () => {
    const old = structuredClone(hearth); old.version = 1; delete old.typography; delete old.icons; delete old.characterAccent;
    const upgraded = normalizeTheme(old);
    assert.equal(upgraded.version, 2);
    assert.deepEqual(upgraded.typography, hearth.typography);
    assert.deepEqual(upgraded.icons, hearth.icons);
    assert.deepEqual(upgraded.characterAccent, {mode: 'portrait'});
});

test('Light Paper proves light, compact, square and low-effect themes', () => {
    const theme = normalizeTheme(paper), variables = colorThemeToCssVariables(theme);
    assert.equal(theme.scheme, 'light');
    assert.deepEqual(theme.presentation, {density: 'compact', messages: 'cards'});
    assert.equal(variables['--shape-radius-medium'], '4px');
    assert.equal(variables['--effect-surface-blur'], '0px');
    assert.equal(variables['--motion-fast'], '0ms');
    assert.ok(contrastRatio(theme.colors.text, theme.colors.canvas) >= 4.5);
    assert.ok(contrastRatio(theme.colors.onAccent, theme.colors.accent) >= 4.5);
});

test('portrait-lit and geometry stress themes are complete and structurally distinct',()=>{
    for(const theme of [nocturne,monolith])assert.equal(validateTheme(theme).valid,true,validateTheme(theme).errors.join('\n'));
    assert.equal(nocturne.characterAccent.mode,'portrait');assert.ok(nocturne.effects.characterGlow>1);assert.equal(nocturne.shape.avatarRadius,32);
    assert.equal(monolith.shape.mediumRadius,0);assert.equal(monolith.effects.blur,0);assert.equal(monolith.effects.shadowStrength,0);assert.equal(monolith.typography.readingFamily,'rubik');
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
    const future = structuredClone(hearth); future.version = 3;
    assert.match(validateColorTheme(future).errors.join(' '), /version must be 2/);
    const unsafe = structuredClone(hearth); unsafe.effects.blur = 99; unsafe.shape.mediumRadius = -1; unsafe.presentation.messages = 'css';
    assert.match(validateTheme(unsafe).errors.join(' '), /shape\.mediumRadius.*effects\.blur.*presentation\.messages/);
    const unreadable = structuredClone(hearth); unreadable.colors.text = unreadable.colors.canvas;
    assert.match(validateTheme(unreadable).errors.join(' '), /text needs 4\.5:1 contrast/);
    const injected = structuredClone(hearth); injected.typography.uiFamily = 'url(https://example.com/font.woff2)'; injected.icons.pack = '<svg>'; injected.characterAccent.mode = 'css';
    assert.match(validateTheme(injected).errors.join(' '), /installed family.*not installed.*portrait/);
});

test('theme resolution emits stable public and calculated CSS variables', () => {
    const variables = colorThemeToCssVariables(hearth);
    assert.equal(variables['--color-canvas'], '#141519');
    assert.equal(variables['--color-border-strong'], '#ffffff24');
    assert.equal(variables['--color-selected'], '#d9b46a24');
    assert.ok(variables['--color-danger-surface']);
    assert.equal(variables['--color-backdrop-soft'], '#0000004d');
    assert.equal(variables['--color-character-ink'], '#0b0c0e');
    assert.equal(variables['--shape-radius-medium'], '10px');
    assert.equal(variables['--effect-surface-blur'], '8px');
    assert.equal(variables['--motion-fast'], '150ms');
    assert.equal(variables['--font-ui'], 'Rubik,system-ui,sans-serif');
    assert.equal(variables['--font-reading'], 'Literata,Georgia,serif');
    assert.equal(variables['--icon-stroke-width'], '1.75');
    const props = {}, root = {style: {setProperty: (name, value) => { props[name] = value; }}, dataset: {}};
    applyColorTheme(hearth, root);
    assert.equal(props['--color-accent'], '#d9b46a');
    assert.equal(props['color-scheme'], 'dark');
    assert.deepEqual(root.dataset, {colorScheme: 'dark', theme: 'hearth', colorTheme: 'hearth', density: 'comfortable', messageStyle: 'reading', iconPack: 'lucide', characterAccent: 'portrait'});
});

test('character accent modes are readable against both built-in canvases', () => {
    const portrait = resolveCharacterAccent(hearth, '#310060');
    assert.equal(portrait.mode, 'portrait');
    assert.ok(contrastRatio(portrait.color, hearth.colors.canvas) >= 4.5);
    assert.ok(contrastRatio(portrait.ink, portrait.color) >= 4.5);
    const fixed = resolveCharacterAccent(paper, '#00ff00');
    assert.equal(fixed.mode, 'fixed');
    assert.equal(fixed.color, paper.colors.characterFallback);
    const disabledTheme = structuredClone(hearth); disabledTheme.characterAccent.mode = 'disabled';
    const disabled = resolveCharacterAccent(disabledTheme, '#00ff00');
    assert.equal(disabled.color, hearth.colors.accent);
    assert.equal(disabled.glow, 0);
    assert.equal(colorThemeToCssVariables(disabledTheme)['--effect-character-glow-strong'], '0%');
});

test('component CSS uses semantic shape, blur and motion variables', () => {
    const css = fs.readdirSync(frontend).filter(name => name.endsWith('.css')).map(name => fs.readFileSync(new URL(name, frontend), 'utf8')).join('\n');
    assert.doesNotMatch(css, /var\(--r-(?:s|m|l|av)\)/);
    assert.doesNotMatch(css, /backdrop-filter:blur\(\d/);
    assert.doesNotMatch(css, /transition:[^;}]*\d(?:\.\d+)?s/);
    assert.match(css, /var\(--shape-radius-message\)/);
    assert.match(css, /var\(--effect-shadow-large\)/);
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
    assert.deepEqual(root.dataset, {colorScheme: 'dark', theme: 'hearth', colorTheme: 'hearth', density: 'comfortable', messageStyle: 'reading', iconPack: 'lucide', characterAccent: 'portrait'});
});

test('a failed theme load leaves the safe CSS fallback alone', async () => {
    const writes = [];
    const root = {style: {setProperty: (...args) => writes.push(args)}, dataset: {}};
    await assert.rejects(
        loadAndApplyColorTheme('/missing.json', {fetch: async () => ({ok: false, status: 404}), root}),
        /Could not load theme \(404\)/,
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
    assert.deepEqual(theme.shape, hearth.shape);
    assert.deepEqual(theme.effects, hearth.effects);
    assert.deepEqual(theme.presentation, hearth.presentation);
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
    assert.equal(storage.value(THEME_STORAGE_KEY), undefined);
    store.cancelPreview();
    assert.equal(store.current().id, 'hearth');
    assert.equal(root.style.values['--color-canvas'], '#141519');
});

test('committing a built-in preview selects the existing theme without creating a copy', () => {
    const storage = memoryStorage(), store = createThemeStore({storage, root: themeRoot(), builtInThemes: [hearth, paper]});
    store.previewId('paper'); store.commitPreview();
    assert.equal(store.selectedId(), 'paper');
    assert.equal(store.list().length, 2);
    assert.equal(JSON.parse(storage.value(THEME_STORAGE_KEY)).themes.length, 0);
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
    assert.equal(storage.value(THEME_STORAGE_KEY), undefined);
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
    const future = structuredClone(hearth); future.id = 'future'; future.version = 3;
    const storage = memoryStorage({[COLOR_THEME_STORAGE_KEY]: JSON.stringify({version: 1, selected: 'future', themes: [{nope: true}, future]})});
    const store = createColorThemeStore({storage, root: themeRoot(), baseTheme: hearth});
    assert.equal(store.current().id, 'hearth');
    assert.equal(store.needsRecovery(), true);
    store.select('hearth');
    assert.equal(store.needsRecovery(), false);
    assert.throws(() => store.remove('hearth'), /cannot be removed/);
    assert.throws(() => store.select('missing'), /Unknown color theme/);
});

test('built-in themes can switch the complete rendered visual contract', () => {
    const root = themeRoot(), applied = [], store = createThemeStore({storage: memoryStorage(), root, builtInThemes: [hearth, paper], onApply: theme => applied.push(theme.id)});
    assert.deepEqual(store.list().map(theme => theme.id), ['hearth', 'paper']);
    store.select('paper');
    assert.equal(store.current().id, 'paper');
    assert.equal(root.dataset.colorScheme, 'light');
    assert.equal(root.dataset.messageStyle, 'cards');
    assert.equal(root.style.values['--effect-surface-blur'], '0px');
    assert.deepEqual(applied, ['hearth', 'paper']);
});

test('complete theme store reads legacy color storage and writes forward without erasing rollback data', () => {
    const legacy = structuredClone(hearth); legacy.kind = 'ui-color-theme'; legacy.version = 1; legacy.id = 'legacy'; legacy.name = 'Legacy';
    delete legacy.shape; delete legacy.effects; delete legacy.presentation; delete legacy.motion; delete legacy.typography; delete legacy.icons; delete legacy.characterAccent;
    const oldRecord = JSON.stringify({version: 1, selected: 'legacy', themes: [legacy]});
    const storage = memoryStorage({[COLOR_THEME_STORAGE_KEY]: oldRecord});
    const store = createThemeStore({storage, root: themeRoot(), baseTheme: hearth});
    assert.equal(store.current().id, 'legacy');
    assert.equal(store.current().shape.mediumRadius, 10);
    store.select('hearth');
    assert.equal(JSON.parse(storage.value(THEME_STORAGE_KEY)).selected, 'hearth');
    assert.equal(storage.value(COLOR_THEME_STORAGE_KEY), oldRecord);
    store.reset();
    assert.equal(storage.value(THEME_STORAGE_KEY), undefined);
    assert.equal(storage.value(COLOR_THEME_STORAGE_KEY), undefined);
});
