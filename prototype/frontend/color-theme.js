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

const OPAQUE_ROLES = new Set([
    'canvas', 'surface', 'raised',
    'text', 'mutedText', 'faintText', 'dialogueText', 'narrationText',
    'accent', 'onAccent', 'link', 'focus',
    'success', 'warning', 'danger', 'characterFallback',
]);

const CSS_NAMES = Object.freeze(Object.fromEntries(COLOR_ROLES.map(role => [
    role,
    `--color-${role.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`,
])));

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
        return {
            r: parseInt(hex.slice(0, 2), 16),
            g: parseInt(hex.slice(2, 4), 16),
            b: parseInt(hex.slice(4, 6), 16),
            a: parseInt(hex.slice(6, 8), 16) / 255,
        };
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
    return {
        r: (front.r * front.a + back.r * back.a * (1 - front.a)) / alpha,
        g: (front.g * front.a + back.g * back.a * (1 - front.a)) / alpha,
        b: (front.b * front.a + back.b * back.a * (1 - front.a)) / alpha,
        a: alpha,
    };
}

export function mixColors(first, second, firstWeight = 0.5) {
    const a = typeof first === 'string' ? parseColor(first) : first;
    const b = typeof second === 'string' ? parseColor(second) : second;
    if (!a || !b || !Number.isFinite(firstWeight)) throw new ColorThemeError('Cannot mix invalid colors.');
    const weight = Math.max(0, Math.min(1, firstWeight));
    return {
        r: a.r * weight + b.r * (1 - weight),
        g: a.g * weight + b.g * (1 - weight),
        b: a.b * weight + b.b * (1 - weight),
        a: a.a * weight + b.a * (1 - weight),
    };
}

const linear = channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

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

function normalizedId(value) {
    return typeof value === 'string' && /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/.test(value) ? value : null;
}

export function validateColorTheme(value) {
    const errors = [];
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {valid: false, errors: ['Theme must be an object.'], theme: null};
    }
    if (value.kind !== COLOR_THEME_KIND) errors.push(`kind must be "${COLOR_THEME_KIND}".`);
    if (value.version !== COLOR_THEME_VERSION) errors.push(`version must be ${COLOR_THEME_VERSION}.`);
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
    if (errors.length) return {valid: false, errors, theme: null};

    const theme = {
        kind: COLOR_THEME_KIND,
        version: COLOR_THEME_VERSION,
        id: value.id,
        name: value.name.trim(),
        scheme: value.scheme,
        colors,
    };
    if (value.source && typeof value.source === 'object' && !Array.isArray(value.source)) {
        const type = typeof value.source.type === 'string' ? value.source.type.trim() : '';
        const name = typeof value.source.name === 'string' ? value.source.name.trim() : '';
        if (type) theme.source = {...(name ? {name} : {}), type};
    }
    return {valid: true, errors: [], theme};
}

export function normalizeColorTheme(value) {
    const result = validateColorTheme(value);
    if (!result.valid) throw new ColorThemeError(`Invalid color theme: ${result.errors.join(' ')}`, result.errors);
    return result.theme;
}

function withAlpha(value, alpha) {
    const color = parseColor(value);
    return colorToHex({...color, a: alpha}, true);
}

function strongerBorder(value) {
    const color = parseColor(value);
    return colorToHex({...color, a: Math.min(1, color.a * 1.8)}, color.a * 1.8 < 1);
}

export function colorThemeToCssVariables(value) {
    const theme = normalizeColorTheme(value), colors = theme.colors;
    const variables = Object.fromEntries(COLOR_ROLES.map(role => [CSS_NAMES[role], colors[role]]));
    Object.assign(variables, {
        '--color-border-strong': strongerBorder(colors.border),
        '--color-hover': withAlpha(colors.text, 0.06),
        '--color-selected': withAlpha(colors.accent, 0.14),
        '--color-warning-surface': colorToHex(mixColors(colors.warning, colors.surface, 0.12), false),
        '--color-warning-border': withAlpha(colors.warning, 0.4),
        '--color-danger-surface': colorToHex(mixColors(colors.danger, colors.surface, 0.12), false),
        '--color-danger-border': withAlpha(colors.danger, 0.4),
        '--color-backdrop-soft': withAlpha(colors.scrim, 0.3),
        '--color-backdrop-strong': withAlpha(colors.scrim, 0.55),
        '--color-character-ink': bestContrastingText(colors.characterFallback),
    });
    return variables;
}

export function applyColorTheme(value, root = globalThis.document?.documentElement) {
    if (!root?.style?.setProperty) throw new ColorThemeError('A document root is required to apply a color theme.');
    const theme = normalizeColorTheme(value), variables = colorThemeToCssVariables(theme);
    for (const [name, color] of Object.entries(variables)) root.style.setProperty(name, color);
    root.style.setProperty('color-scheme', theme.scheme);
    root.dataset.colorScheme = theme.scheme;
    root.dataset.colorTheme = theme.id;
    return theme;
}

export async function loadAndApplyColorTheme(url, {
    fetch: fetchTheme = globalThis.fetch,
    root = globalThis.document?.documentElement,
} = {}) {
    if (typeof fetchTheme !== 'function') throw new ColorThemeError('A fetch function is required to load a color theme.');
    const response = await fetchTheme(url, {cache: 'no-store'});
    if (!response?.ok) throw new ColorThemeError(`Could not load color theme (${response?.status ?? 'no response'}).`);
    let value;
    try {
        value = await response.json();
    } catch {
        throw new ColorThemeError('Color theme is not valid JSON.');
    }
    return applyColorTheme(value, root);
}
