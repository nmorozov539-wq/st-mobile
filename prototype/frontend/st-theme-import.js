import {
    THEME_KIND,
    THEME_VERSION,
    ColorThemeError,
    bestContrastingText,
    colorToHex,
    compositeColor,
    contrastRatio,
    mixColors,
    normalizeTheme,
    parseColor,
} from './color-theme.js';

export const ST_COLOR_FIELDS = Object.freeze([
    'main_text_color', 'italics_text_color', 'underline_text_color', 'quote_text_color',
    'blur_tint_color', 'chat_tint_color', 'user_mes_blur_tint_color',
    'bot_mes_blur_tint_color', 'shadow_color', 'border_color',
]);

const slug = value => String(value).toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'imported';

function opaque(value, background) {
    const parsed = parseColor(value);
    if (!parsed) return null;
    return colorToHex(parsed.a < 1 ? compositeColor(parsed, background) : parsed, false);
}

function readable(value, background, minimum = 4.5) {
    const initial = opaque(value, background);
    if (!initial || contrastRatio(initial, background) >= minimum) return initial;
    const target = bestContrastingText(background);
    for (let weight = 0.9; weight >= 0; weight -= 0.05) {
        const candidate = colorToHex(mixColors(initial, target, weight), false);
        if (contrastRatio(candidate, background) >= minimum) return candidate;
    }
    return target;
}

function sourceColor(stTheme, field, fallback, warnings) {
    if (parseColor(stTheme[field])) return stTheme[field];
    warnings.push(`Missing or invalid ${field}; used the compatibility theme value.`);
    return fallback;
}

/**
 * Convert one native SillyTavern theme object into our complete color-theme format.
 * Layout, behavior and custom_css fields are deliberately ignored.
 */
export function importSillyTavernTheme(stTheme, {baseTheme} = {}) {
    if (!stTheme || typeof stTheme !== 'object' || Array.isArray(stTheme)) throw new ColorThemeError('SillyTavern theme must be an object.');
    if (typeof stTheme.name !== 'string' || !stTheme.name.trim()) throw new ColorThemeError('SillyTavern theme is missing its name.');
    const base = normalizeTheme(baseTheme), warnings = [];
    if (typeof stTheme.custom_css === 'string' && stTheme.custom_css.trim()) warnings.push('Custom CSS was ignored.');

    const pick = (field, role) => sourceColor(stTheme, field, base.colors[role], warnings);
    const mainInput = pick('main_text_color', 'text');
    const scheme = parseColor(mainInput) && contrastRatio(mainInput, '#000000') > contrastRatio(mainInput, '#ffffff') ? 'dark' : 'light';
    const underlay = scheme === 'dark' ? '#000000' : '#ffffff';
    const canvas = opaque(pick('chat_tint_color', 'canvas'), underlay);
    const surface = opaque(pick('blur_tint_color', 'surface'), canvas);
    const text = readable(mainInput, canvas);
    const narration = readable(pick('italics_text_color', 'narrationText'), canvas, 3);
    const dialogue = readable(pick('quote_text_color', 'dialogueText'), canvas);
    const link = readable(pick('underline_text_color', 'link'), canvas);
    const accent = readable(pick('quote_text_color', 'accent'), surface, 3);

    const theme = {
        ...base,
        kind: THEME_KIND,
        version: THEME_VERSION,
        id: `st-${slug(stTheme.name)}`,
        name: stTheme.name.trim(),
        scheme,
        source: {type: 'sillytavern', name: stTheme.name.trim()},
        colors: {
            canvas,
            surface,
            raised: colorToHex(mixColors(text, surface, 0.07), false),
            text,
            mutedText: readable(narration, surface, 3),
            faintText: readable(colorToHex(mixColors(narration, canvas, 0.82), false), canvas, 3),
            dialogueText: dialogue,
            narrationText: narration,
            accent,
            onAccent: bestContrastingText(accent),
            link,
            focus: readable(link, surface, 3),
            success: readable(base.colors.success, surface, 3),
            warning: readable(base.colors.warning, surface, 3),
            danger: readable(base.colors.danger, surface, 3),
            userMessage: colorToHex(parseColor(pick('user_mes_blur_tint_color', 'userMessage'))),
            assistantMessage: colorToHex(parseColor(pick('bot_mes_blur_tint_color', 'assistantMessage'))),
            border: colorToHex(parseColor(pick('border_color', 'border'))),
            shadow: colorToHex(parseColor(pick('shadow_color', 'shadow'))),
            scrim: base.colors.scrim,
            characterFallback: accent,
        },
    };
    return {theme: normalizeTheme(theme), warnings};
}
