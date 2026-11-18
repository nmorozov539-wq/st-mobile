import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyColorTheme, colorThemeToCssVariables, contrastRatio, loadAndApplyColorTheme, normalizeColor, normalizeColorTheme, parseColor, validateColorTheme} from '../prototype/frontend/color-theme.js';
import {importSillyTavernTheme} from '../prototype/frontend/st-theme-import.js';

const hearth = JSON.parse(fs.readFileSync(new URL('../prototype/frontend/themes/hearth.json', import.meta.url), 'utf8'));

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
