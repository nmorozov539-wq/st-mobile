// JSON normalizes Date fields just as ST's save request does. Sort object keys;
// preserve array order, unknown message fields, swipe data, and metadata.
export function canonical(value) {
    const normalize = item => {
        if (Array.isArray(item)) return item.map(normalize);
        if (item && typeof item === 'object') return Object.fromEntries(Object.keys(item).sort().map(key => [key, normalize(item[key])]));
        return item;
    };
    return JSON.stringify(normalize(JSON.parse(JSON.stringify(value))));
}
export function assertPersisted(snapshot, saved) {
    const metadata = value => {
        const copy = { ...value };
        // ST initializes these empty world-info timers while loading a chat.
        // Their absence and this exact empty value have the same meaning.
        if (canonical(copy.timedWorldInfo ?? null) === canonical({ sticky: {}, cooldown: {} })) delete copy.timedWorldInfo;
        return copy;
    };
    const matches = Array.isArray(saved) && saved.length === snapshot.messages.length + 1 &&
        canonical(saved.slice(1)) === canonical(snapshot.messages) &&
        canonical(metadata(saved[0]?.chat_metadata ?? {})) === canonical(metadata(snapshot.metadata));
    if (!matches) throw Object.assign(new Error('Saved chat does not match ST’s current messages and metadata. Do not resend automatically.'), { code: 'PERSISTENCE_MISMATCH' });
}
