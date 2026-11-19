export function readableError(value, fallback = 'The request failed.') {
    let current = value?.summary ?? value?.message ?? value;
    for (let depth = 0; depth < 3; depth++) {
        if (typeof current !== 'string') break;
        const text = current.trim();
        if (!text || !/^[{[]/.test(text)) break;
        try {
            const parsed = JSON.parse(text), next = parsed?.error?.message ?? parsed?.error ?? parsed?.detail ?? parsed?.message;
            if (next == null || next === current) break;
            current = next;
        } catch { break; }
    }
    if (current && typeof current === 'object') current = current.message ?? current.detail ?? fallback;
    const text = String(current ?? fallback).replace(/^Error:\s*/i, '').trim() || fallback;
    return text.length > 700 ? `${text.slice(0, 697)}…` : text;
}
