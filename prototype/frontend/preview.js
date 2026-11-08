// One-line previews of a chat's last message: no markdown marks, no HTML tags, no code fences.
const ENTITIES = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'"};

export function plainPreview(text, max = 240) {
    let s = String(text ?? '').replace(/\r\n?/g, '\n');
    s = s.replace(/<(style|script|think|thinking)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');
    s = s.replace(/<br\s*\/?>/gi, ' ').replace(/<\/?[a-z][^>\n]*>/gi, ' ');
    s = s.replace(/```[^\n]*\n?([\s\S]*?)(```|$)/g, ' ');
    s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]\n]+)\]\([^)\s]*\)/g, '$1');
    s = s.replace(/^[ \t]{0,3}(?:#{1,6}[ \t]+|>[ \t]?|[-*+][ \t]+|\d+[.)][ \t]+)/gm, '');
    s = s.replace(/^[ \t]*([-*_])(?:[ \t]*\1){2,}[ \t]*$/gm, ' ');
    s = s.replace(/\*\*|__|~~|`/g, '').replace(/\*/g, '');
    s = s.replace(/(^|[^\p{L}\p{N}])_+(?=\S)/gu, '$1').replace(/(\S)_+(?=[^\p{L}\p{N}]|$)/gu, '$1');
    s = s.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (m, name) => {
        const lower = name.toLowerCase();
        if (lower in ENTITIES) return ENTITIES[lower];
        if (lower.startsWith('#x')) return String.fromCodePoint(parseInt(lower.slice(2), 16) || 32);
        if (lower.startsWith('#')) return String.fromCodePoint(Number(lower.slice(1)) || 32);
        return m;
    });
    s = s.replace(/\s+/g, ' ').trim();
    if (s.length > max) s = s.slice(0, max - 1).trimEnd() + '…';
    return s;
}
