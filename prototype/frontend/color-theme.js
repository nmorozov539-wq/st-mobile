export const THEME_KIND = 'ui-theme';
export const THEME_VERSION = 1;
export const COLOR_THEME_KIND = 'ui-color-theme';
export const COLOR_THEME_VERSION = 1;

export const COLOR_ROLES = Object.freeze([
    'canvas', 'surface', 'raised',
    'text', 'mutedText', 'faintText', 'dialogueText', 'narrationText',
    'accent', 'onAccent', 'link', 'focus',
    'success', 'warning', 'danger',
    'userMessage', 'assistantMessage',
    'border', 'shadow', 'scrim',
    'characterFallback',
]);

export const HEARTH_VISUALS = Object.freeze({
    shape: Object.freeze({smallRadius: 6, mediumRadius: 10, largeRadius: 16, avatarRadius: 12, messageRadius: 10, borderWidth: 1}),
    effects: Object.freeze({chromeOpacity: 0.7, blur: 8, shadowStrength: 1, backgroundGlow: 1, characterGlow: 1}),
    presentation: Object.freeze({density: 'comfortable', messages: 'reading'}),
    motion: Object.freeze({scale: 1}),
});

const OPAQUE_ROLES = new Set([
    'canvas', 'surface', 'raised',
    'text', 'mutedText', 'faintText', 'dialogueText', 'narrationText',
    'accent', 'onAccent', 'link', 'focus',
    'success', 'warning', 'danger', 'characterFallback',
]);
const CSS_NAMES = Object.freeze(Object.fromEntries(COLOR_ROLES.map(role => [role, `--color-${role.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`])));
const SHAPE_RULES = Object.freeze({smallRadius: [0, 12], mediumRadius: [0, 20], largeRadius: [0, 32], avatarRadius: [0, 32], messageRadius: [0, 32], borderWidth: [0, 2]});
const EFFECT_RULES = Object.freeze({chromeOpacity: [0.6, 1], blur: [0, 24], shadowStrength: [0, 1.5], backgroundGlow: [0, 1.5], characterGlow: [0, 1.5]});
const DENSITIES = new Set(['compact', 'comfortable', 'spacious']);
const MESSAGE_STYLES = new Set(['reading', 'bubbles', 'cards']);

export class ColorThemeError extends Error {
    constructor(message, errors = []) {
        super(message);
        this.name = 'ColorThemeError';
        this.code = 'INVALID_COLOR_THEME';
        this.errors = errors;
    }
}

const byte = value => Math.max(0, Math.min(255, Math.round(value)));
const hexByte = value => byte(value).toString(16).padStart(2, '0');
const clone = value => JSON.parse(JSON.stringify(value));

/** Parse the CSS color forms accepted by ST theme files and our own theme files. */
export function parseColor(value) {
    if (typeof value !== 'string') return null;
    const input = value.trim();
    let match = /^#([0-9a-f]{3,8})$/i.exec(input);
    if (match) {
        let hex = match[1];
        if (![3, 4, 6, 8].includes(hex.length)) return null;
        if (hex.length <= 4) hex = [...hex].map(part => part + part).join('');
        if (hex.length === 6) hex += 'ff';
        return {r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16), a: parseInt(hex.slice(6, 8), 16) / 255};
    }
    match = /^rgba?\(\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*[, ]\s*([+-]?(?:\d+\.?\d*|\.\d+))\s*[, ]\s*([+-]?(?:\d+\.?\d*|\.\d+))(?:\s*[,/]\s*([+-]?(?:\d+\.?\d*|\.\d+)%?))?\s*\)$/i.exec(input);
    if (!match) return null;
    const alpha = match[4]?.endsWith('%') ? Number(match[4].slice(0, -1)) / 100 : Number(match[4] ?? 1);
    const channels = match.slice(1, 4).map(Number);
    if (![...channels, alpha].every(Number.isFinite)) return null;
    if (channels.some(channel => channel < 0 || channel > 255) || alpha < 0 || alpha > 1) return null;
    return {r: byte(channels[0]), g: byte(channels[1]), b: byte(channels[2]), a: alpha};
}

export function colorToHex(color, keepAlpha = color.a < 1) {
    const alpha = hexByte((color.a ?? 1) * 255);
    return `#${hexByte(color.r)}${hexByte(color.g)}${hexByte(color.b)}${keepAlpha ? alpha : ''}`;
}
export function normalizeColor(value, {opaque = false} = {}) {
    const color = parseColor(value);
    if (!color || (opaque && color.a < 1)) return null;
    return colorToHex(color);
}
export function compositeColor(foreground, background) {
    const front = typeof foreground === 'string' ? parseColor(foreground) : foreground;
    const back = typeof background === 'string' ? parseColor(background) : background;
    if (!front || !back) throw new ColorThemeError('Cannot composite an invalid color.');
    const alpha = front.a + back.a * (1 - front.a);
    if (alpha <= 0) return {r: 0, g: 0, b: 0, a: 0};
    return {r: (front.r * front.a + back.r * back.a * (1 - front.a)) / alpha, g: (front.g * front.a + back.g * back.a * (1 - front.a)) / alpha, b: (front.b * front.a + back.b * back.a * (1 - front.a)) / alpha, a: alpha};
}
export function mixColors(first, second, firstWeight = 0.5) {
    const a = typeof first === 'string' ? parseColor(first) : first;
    const b = typeof second === 'string' ? parseColor(second) : second;
    if (!a || !b || !Number.isFinite(firstWeight)) throw new ColorThemeError('Cannot mix invalid colors.');
    const weight = Math.max(0, Math.min(1, firstWeight));
    return {r: a.r * weight + b.r * (1 - weight), g: a.g * weight + b.g * (1 - weight), b: a.b * weight + b.b * (1 - weight), a: a.a * weight + b.a * (1 - weight)};
}
const linear = channel => { const value = channel / 255; return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; };
export function contrastRatio(first, second) {
    const a = typeof first === 'string' ? parseColor(first) : first;
    const b = typeof second === 'string' ? parseColor(second) : second;
    if (!a || !b) throw new ColorThemeError('Cannot compare invalid colors.');
    const luminance = color => 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
    const x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function bestContrastingText(background) {
    const black = '#0b0c0e', white = '#ffffff';
    return contrastRatio(black, background) >= contrastRatio(white, background) ? black : white;
}

const normalizedId = value => typeof value === 'string' && /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(value) ? value : null;
const boundedNumber = (value, [minimum, maximum]) => typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum ? value : null;

export function upgradeColorTheme(value) {
    if (!value || typeof value !== 'object' || value.kind !== COLOR_THEME_KIND || value.version !== COLOR_THEME_VERSION) return value;
    return {...clone(value), kind: THEME_KIND, version: THEME_VERSION, ...clone(HEARTH_VISUALS)};
}

export function validateTheme(input) {
    const value = upgradeColorTheme(input), errors = [];
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {valid: false, errors: ['Theme must be an object.'], theme: null};
    if (value.kind !== THEME_KIND) errors.push(`kind must be "${THEME_KIND}".`);
    if (value.version !== THEME_VERSION) errors.push(`version must be ${THEME_VERSION}.`);
    if (!normalizedId(value.id)) errors.push('id must contain lowercase letters, numbers, dots, underscores or hyphens.');
    if (typeof value.name !== 'string' || !value.name.trim()) errors.push('name is required.');
    if (!['dark', 'light'].includes(value.scheme)) errors.push('scheme must be "dark" or "light".');
    if (!value.colors || typeof value.colors !== 'object' || Array.isArray(value.colors)) errors.push('colors must be an object.');
    const colors = {};
    for (const role of COLOR_ROLES) {
        const color = normalizeColor(value.colors?.[role], {opaque: OPAQUE_ROLES.has(role)});
        if (!color) errors.push(`${role} must be a valid${OPAQUE_ROLES.has(role) ? ' opaque' : ''} color.`);
        else colors[role] = color;
    }
    for (const [foreground, background, minimum] of [
        ['text', 'canvas', 4.5], ['mutedText', 'canvas', 4.5], ['faintText', 'canvas', 3],
        ['dialogueText', 'canvas', 4.5], ['narrationText', 'canvas', 3], ['onAccent', 'accent', 4.5],
        ['link', 'canvas', 4.5], ['focus', 'canvas', 3], ['success', 'surface', 3], ['warning', 'surface', 3], ['danger', 'surface', 3],
    ]) {
        if (colors[foreground] && colors[background] && contrastRatio(colors[foreground], colors[background]) < minimum) errors.push(`${foreground} needs ${minimum}:1 contrast against ${background}.`);
    }
    const shape = {}, effects = {};
    for (const [role, bounds] of Object.entries(SHAPE_RULES)) {
        const number = boundedNumber(value.shape?.[role], bounds);
        if (number === null) errors.push(`shape.${role} must be between ${bounds[0]} and ${bounds[1]}.`); else shape[role] = number;
    }
    for (const [role, bounds] of Object.entries(EFFECT_RULES)) {
        const number = boundedNumber(value.effects?.[role], bounds);
        if (number === null) errors.push(`effects.${role} must be between ${bounds[0]} and ${bounds[1]}.`); else effects[role] = number;
    }
    const density = value.presentation?.density, messages = value.presentation?.messages;
    if (!DENSITIES.has(density)) errors.push('presentation.density is invalid.');
    if (!MESSAGE_STYLES.has(messages)) errors.push('presentation.messages is invalid.');
    const motionScale = boundedNumber(value.motion?.scale, [0, 2]);
    if (motionScale === null) errors.push('motion.scale must be between 0 and 2.');
    if (errors.length) return {valid: false, errors, theme: null};
    const theme = {kind: THEME_KIND, version: THEME_VERSION, id: value.id, name: value.name.trim(), scheme: value.scheme, colors, shape, effects, presentation: {density, messages}, motion: {scale: motionScale}};
    if (value.source && typeof value.source === 'object' && !Array.isArray(value.source)) {
        const type = typeof value.source.type === 'string' ? value.source.type.trim() : '';
        const name = typeof value.source.name === 'string' ? value.source.name.trim() : '';
        if (type) theme.source = {...(name ? {name} : {}), type};
    }
    return {valid: true, errors: [], theme};
}

export function normalizeTheme(value) {
    const result = validateTheme(value);
    if (!result.valid) throw new ColorThemeError(`Invalid theme: ${result.errors.join(' ')}`, result.errors);
    return result.theme;
}

const withAlpha = (value, alpha) => colorToHex({...parseColor(value), a: alpha}, true);
const strongerBorder = value => { const color = parseColor(value); return colorToHex({...color, a: Math.min(1, color.a * 1.8)}, color.a * 1.8 < 1); };
const scaledAlpha = (value, scale) => { const color = parseColor(value); return colorToHex({...color, a: Math.min(1, color.a * scale)}, true); };
const px = value => `${value}px`;
const densityScale = value => ({compact: 0.88, comfortable: 1, spacious: 1.12})[value];

export function themeToCssVariables(value) {
    const theme = normalizeTheme(value), {colors, shape, effects, motion} = theme;
    const variables = Object.fromEntries(COLOR_ROLES.map(role => [CSS_NAMES[role], colors[role]]));
    const shadow = scaledAlpha(colors.shadow, effects.shadowStrength);
    Object.assign(variables, {
        '--color-border-strong': strongerBorder(colors.border), '--color-hover': withAlpha(colors.text, 0.06), '--color-selected': withAlpha(colors.accent, 0.14),
        '--color-warning-surface': colorToHex(mixColors(colors.warning, colors.surface, 0.12), false), '--color-warning-border': withAlpha(colors.warning, 0.4),
        '--color-danger-surface': colorToHex(mixColors(colors.danger, colors.surface, 0.12), false), '--color-danger-border': withAlpha(colors.danger, 0.4),
        '--color-backdrop-soft': withAlpha(colors.scrim, 0.3), '--color-backdrop-strong': withAlpha(colors.scrim, 0.55), '--color-character-ink': bestContrastingText(colors.characterFallback),
        '--shape-radius-small': px(shape.smallRadius), '--shape-radius-medium': px(shape.mediumRadius), '--shape-radius-large': px(shape.largeRadius),
        '--shape-radius-avatar': px(shape.avatarRadius), '--shape-radius-message': px(shape.messageRadius), '--shape-border-width': px(shape.borderWidth),
        '--effect-chrome-opacity': String(effects.chromeOpacity), '--effect-surface-blur': px(effects.blur), '--effect-shadow-color': shadow,
        '--effect-shadow-small': `0 4px 20px ${shadow}`, '--effect-shadow-medium': `0 8px 24px ${shadow}`, '--effect-shadow-large': `0 16px 40px ${shadow}`,
        '--effect-background-glow': String(effects.backgroundGlow), '--effect-character-glow': String(effects.characterGlow),
        '--effect-chrome-opacity-percent': `${Math.round(effects.chromeOpacity * 100)}%`,
        '--effect-glow-base': `${13 * effects.backgroundGlow}%`, '--effect-glow-chat': `${18 * effects.backgroundGlow}%`, '--effect-glow-panel': `${16 * effects.backgroundGlow}%`,
        '--effect-character-glow-subtle': `${22 * effects.characterGlow}%`, '--effect-character-glow-soft': `${45 * effects.characterGlow}%`,
        '--effect-character-glow-cast': `${55 * effects.characterGlow}%`, '--effect-character-glow-strong': `${70 * effects.characterGlow}%`, '--effect-character-tint': `${28 * effects.characterGlow}%`,
        '--density-scale': String(densityScale(theme.presentation.density)), '--motion-fast': `${Math.round(150 * motion.scale)}ms`, '--motion-panel': `${Math.round(180 * motion.scale)}ms`, '--motion-slow': `${Math.round(400 * motion.scale)}ms`,
    });
    return variables;
}

export function applyTheme(value, root = globalThis.document?.documentElement) {
    if (!root?.style?.setProperty) throw new ColorThemeError('A document root is required to apply a theme.');
    const theme = normalizeTheme(value), variables = themeToCssVariables(theme);
    for (const [name, resolved] of Object.entries(variables)) root.style.setProperty(name, resolved);
    root.style.setProperty('color-scheme', theme.scheme);
    root.dataset.colorScheme = theme.scheme; root.dataset.theme = theme.id; root.dataset.colorTheme = theme.id;
    root.dataset.density = theme.presentation.density; root.dataset.messageStyle = theme.presentation.messages;
    root.ownerDocument?.querySelector?.('meta[name="theme-color"]')?.setAttribute('content', theme.colors.canvas);
    return theme;
}

export async function loadTheme(url, {fetch: fetchTheme = globalThis.fetch} = {}) {
    if (typeof fetchTheme !== 'function') throw new ColorThemeError('A fetch function is required to load a theme.');
    const response = await fetchTheme(url, {cache: 'no-store'});
    if (!response?.ok) throw new ColorThemeError(`Could not load theme (${response?.status ?? 'no response'}).`);
    let value; try { value = await response.json(); } catch { throw new ColorThemeError('Theme is not valid JSON.'); }
    return normalizeTheme(value);
}
export async function loadAndApplyTheme(url, options = {}) { return applyTheme(await loadTheme(url, options), options.root); }

// Compatibility names for color-only callers and previously exported API.
export const validateColorTheme = validateTheme;
export const normalizeColorTheme = normalizeTheme;
export const colorThemeToCssVariables = themeToCssVariables;
export const applyColorTheme = applyTheme;
export const loadAndApplyColorTheme = loadAndApplyTheme;
